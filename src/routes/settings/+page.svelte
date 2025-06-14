<script lang="ts">
	import { onMount } from 'svelte';
	import { settingsStorage, projectStorage, chatEventStorage } from '$lib/storage';
	import { goto } from '$app/navigation';
	import { Eye, EyeOff, ArrowLeft } from '@lucide/svelte';
	import Logo from '$lib/components/ui/Logo.svelte';

	let apiKey = $state('');
	let originalApiKey = $state('');
	let isLoading = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');
	let fileInput: HTMLInputElement;
	let showApiKey = $state(false);
	const apiKeyStorageKey = 'openrouter_api_key';

	let checkingConnection = $state(false);
	let connectionStatus = $state<'idle' | 'success' | 'error'>('idle');
	let modelsError = $state('');

	const hasChanges = $derived(apiKey.trim() !== originalApiKey);

	onMount(async () => {
		const storedKey = await settingsStorage.getSetting<string>(apiKeyStorageKey);
		if (storedKey) {
			apiKey = storedKey;
			originalApiKey = storedKey;
		}
	});

	async function saveApiKey() {
		if (!apiKey.trim()) {
			errorMessage = 'Please enter a valid API Key.';
			successMessage = '';
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			await settingsStorage.setSetting(apiKeyStorageKey, apiKey.trim());
			originalApiKey = apiKey.trim();
			successMessage = 'API Key saved successfully!';
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (error) {
			console.error('Failed to save API key:', error);
			errorMessage = 'Failed to save API Key. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function deleteApiKey() {
		if (!confirm('Are you sure you want to delete your API key? You will need to re-enter it to use the application.')) {
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			await settingsStorage.deleteSetting(apiKeyStorageKey);
			apiKey = '';
			originalApiKey = '';
			successMessage = 'API Key deleted successfully!';
			setTimeout(() => {
				goto('/ask-for-api-key');
			}, 1500);
		} catch (error) {
			console.error('Failed to delete API key:', error);
			errorMessage = 'Failed to delete API Key. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function clearAllData() {
		if (!confirm('Are you sure you want to delete ALL data? This will permanently remove all projects, chat history, and settings. This action cannot be undone.')) {
			return;
		}

		if (!confirm('This is your final warning. All your data will be permanently deleted. Are you absolutely sure?')) {
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Clear all storage
			await projectStorage.clear();
			await chatEventStorage.clear();
			await settingsStorage.deleteSetting(apiKeyStorageKey);
			
			successMessage = 'All data cleared successfully! Redirecting...';
			setTimeout(() => {
				goto('/ask-for-api-key');
			}, 2000);
		} catch (error) {
			console.error('Failed to clear data:', error);
			errorMessage = 'Failed to clear all data. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function downloadAllData() {
		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Collect all data
			const projects = await projectStorage.getAll();
			const chatEvents = await chatEventStorage.getAll();
			const apiKeyData = await settingsStorage.getSetting<string>(apiKeyStorageKey);

			const exportData = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				data: {
					projects,
					chatEvents,
					settings: {
						[apiKeyStorageKey]: apiKeyData || null
					}
				}
			};

			// Create and download file
			const dataStr = JSON.stringify(exportData, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);
			
			const link = document.createElement('a');
			link.href = url;
			link.download = `inja-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			successMessage = 'Data exported successfully!';
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (error) {
			console.error('Failed to export data:', error);
			errorMessage = 'Failed to export data. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function importData() {
		if (!fileInput.files || fileInput.files.length === 0) {
			errorMessage = 'Please select a file to import.';
			return;
		}

		const file = fileInput.files[0];
		if (!file.name.endsWith('.json')) {
			errorMessage = 'Please select a valid JSON file.';
			return;
		}

		if (!confirm('This will replace ALL existing data with the imported data. Are you sure you want to continue?')) {
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const fileContent = await file.text();
			const importDataJson = JSON.parse(fileContent);

			// Validate the import data structure
			if (!importDataJson.version || !importDataJson.data) {
				throw new Error('Invalid backup file format.');
			}

			const { projects, chatEvents, settings } = importDataJson.data;

			// Clear existing data
			await projectStorage.clear();
			await chatEventStorage.clear();

			// Import projects
			if (projects && Array.isArray(projects)) {
				for (const project of projects) {
					// Ensure dates are properly converted if they are strings
					const createdAt = project.createdAt ? new Date(project.createdAt) : new Date();
					const updatedAt = project.updatedAt ? new Date(project.updatedAt) : new Date();
					
					await projectStorage.store({
						name: project.name,
						description: project.description,
						htmlContent: project.htmlContent,
						isPrivate: project.isPrivate || false,
						// Dexie will auto-generate id, createdAt, updatedAt if not provided or if they are part of the Omit type
						// However, if we are importing, we might want to preserve them.
						// The current projectStorage.store expects Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
						// For import, we might need a different method or adjust this one.
						// For now, let's assume we want to re-generate IDs and timestamps for simplicity of this example
						// or adjust the store method to accept them.
						// If preserving, ensure the Project type matches.
					}, project.id, createdAt, updatedAt); // Assuming store can take optional id, createdAt, updatedAt for imports
				}
			}

			// Import chat events
			if (chatEvents && Array.isArray(chatEvents)) {
				for (const event of chatEvents) {
					// Ensure dates are properly converted
					const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
					const eventToStore = { ...event, timestamp };
					await chatEventStorage.store(eventToStore, event.projectId);
				}
			}

			// Import settings (including API key)
			if (settings && typeof settings === 'object') {
				for (const [key, value] of Object.entries(settings)) {
					if (value !== null) {
						await settingsStorage.setSetting(key, value);
					}
				}
				// Update local API key state if imported
				const importedApiKey = settings[apiKeyStorageKey];
				if (importedApiKey) {
					apiKey = importedApiKey;
					originalApiKey = importedApiKey;
				}
			}

			successMessage = 'Data imported successfully! Refreshing page...';
			setTimeout(() => {
				window.location.reload();
			}, 2000);

		} catch (error: any) {
			console.error('Failed to import data:', error);
			errorMessage = `Failed to import data: ${error.message}`;
		} finally {
			isLoading = false;
			// Clear the file input
			if (fileInput) fileInput.value = '';
		}
	}

	function triggerFileInput() {
		fileInput.click();
	}

	function goBack() {
		history.back();
	}

	async function handleCheckConnection() {
		if (!apiKey.trim()) {
			modelsError = 'Please enter an API Key to check the connection.';
			connectionStatus = 'error';
			successMessage = '';
			errorMessage = '';
			return;
		}
		checkingConnection = true;
		connectionStatus = 'idle';
		modelsError = '';
		successMessage = '';
		errorMessage = '';

		try {
			// Create a temporary function that uses the provided API key
			const testApiCall = async () => {
				const headers = {
					Authorization: `Bearer ${apiKey.trim()}`,
					"Content-Type": "application/json",
				};

				const body = {
					model: "qwen/qwen3-32b",
					messages: [{ role: "user", content: "Hello" }],
				};

				const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
					method: "POST",
					headers,
					body: JSON.stringify(body),
				});

				if (!response.ok) {
					const errorBody = await response.text();
					throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
				}

				return await response.json();
			};

			await testApiCall();
			connectionStatus = 'success';
		} catch (error: any) {
			console.error('Failed to check connection:', error);
			modelsError = error.message || 'An unknown error occurred while checking the connection.';
			connectionStatus = 'error';
		} finally {
			checkingConnection = false;
		}
	}

	let optimizerModel = $state('meta-llama/llama-3.1-8b-instruct');
	let originalOptimizerModel = $state('meta-llama/llama-3.1-8b-instruct');
	const optimizerModelStorageKey = 'optimizer_model';

	const optimizerModels = [
	{
		id: 'meta-llama/llama-3.1-8b-instruct',
		label: 'Meta: Llama 3.1 8B Instruct',
		desc: 'Fast, efficient. 131K ctx.'
	},
	{
		id: 'qwen/qwen3-32b',
		label: 'Qwen: Qwen3 32B',
		desc: 'Dense 32.8B, 131K ctx.'
	},
	{
		id: 'meta-llama/llama-4-scout',
		label: 'Meta: Llama 4 Scout',
		desc: '17B MoE, 10M ctx.'
	},
	{
		id: 'deepseek/deepseek-r1-distill-llama-70b',
		label: 'DeepSeek: R1 Distill Llama 70B',
		desc: 'Distilled 70B, 128K ctx.'
	},
	{
		id: 'meta-llama/llama-3.3-70b-instruct',
		label: 'Meta: Llama 3.3 70B Instruct',
		desc: 'Multilingual, 131K ctx.'
	}
];

onMount(async () => {
	const storedOptimizerModel = await settingsStorage.getSetting<string>(optimizerModelStorageKey);
	if (storedOptimizerModel) {
		optimizerModel = storedOptimizerModel;
		originalOptimizerModel = storedOptimizerModel;
	}
});

const hasOptimizerModelChanges = $derived(optimizerModel !== originalOptimizerModel);

async function saveOptimizerModel() {
	isLoading = true;
	errorMessage = '';
	successMessage = '';
	try {
		await settingsStorage.setSetting(optimizerModelStorageKey, optimizerModel);
		originalOptimizerModel = optimizerModel;
		successMessage = 'Optimizer model saved!';
		setTimeout(() => { successMessage = ''; }, 2000);
	} catch (error) {
		console.error('Failed to save optimizer model:', error);
		errorMessage = 'Failed to save optimizer model.';
	} finally {
		isLoading = false;
	}
}
</script>

<svelte:head>
	<title>Settings - inja.online</title>
</svelte:head>

<div class="min-h-screen bg-dark-primary text-white p-8 flex flex-col">
	<!-- Top Section with Brand and Back Link -->
	<div class="flex justify-between items-start mb-16">
		<Logo />
		<!-- Improved Back Button -->
		<button
			onclick={goBack}
			class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-primary-accent hover:bg-zinc-800 hover:border-primary-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-accent transition-all duration-200 shadow-sm group"
			title="Back"
		>
			<ArrowLeft size={18} class="transition-colors duration-200 group-hover:text-white" />
			<span class="text-sm font-medium tracking-wide">Back</span>
		</button>
	</div>

	<!-- Main Content Container -->
	<div class="flex-1 flex items-start justify-center">
		<div class="w-full max-w-2xl space-y-8">
			<!-- Page Title -->
			<h2 class="text-3xl font-light text-white text-center">
				Settings
			</h2>

			<!-- API Key Section -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
				<div>
					<h3 class="text-xl font-medium text-white mb-2">OpenRouter API Key</h3>
					<p class="text-text-muted text-sm">
						Your API key is stored locally in your browser and is used to power the AI features.
						Get your API key from 
						<a
							href="https://openrouter.ai/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary-accent hover:text-white underline transition-colors duration-200"
						>
							OpenRouter.ai
						</a>
					</p>
				</div>

				<!-- Success/Error Messages -->
				{#if successMessage}
					<div class="bg-green-900/50 border border-green-700 rounded-lg p-4">
						<p class="text-green-300 text-sm">{successMessage}</p>
					</div>
				{/if}

				{#if errorMessage}
					<div class="bg-red-900/50 border border-red-700 rounded-lg p-4">
						<p class="text-red-300 text-sm">{errorMessage}</p>
					</div>
				{/if}

				<!-- API Key Input -->
				<div class="space-y-4">
					<div>
						<label for="apiKey" class="block text-sm font-medium text-zinc-300 mb-2">
							API Key
						</label>
						<div class="relative">
							<input
								type={showApiKey ? "text" : "password"}
								id="apiKey"
								bind:value={apiKey}
								placeholder="sk-or-..."
								class="w-full px-4 py-2.5 pr-12 bg-zinc-800 border border-zinc-700 rounded-md focus:ring-2 focus:ring-primary-accent focus:border-primary-accent outline-none transition-colors duration-200 text-zinc-100 placeholder-zinc-400"
							/>
							<button
								type="button"
								onclick={() => showApiKey = !showApiKey}
								class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors duration-200"
								title={showApiKey ? "Hide API key" : "Show API key"}
							>
								{#if showApiKey}
									<EyeOff size={18} />
								{:else}
									<Eye size={18} />
								{/if}
							</button>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex space-x-3">
						<button
							onclick={saveApiKey}
							disabled={!hasChanges || isLoading}
							class="px-4 py-2 bg-primary-accent hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Saving...' : 'Save Changes'}
						</button>

						{#if originalApiKey}
							<button
								onclick={deleteApiKey}
								disabled={isLoading}
								class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
							>
								Delete API Key
							</button>
						{/if}
						<button
							onclick={handleCheckConnection}
							disabled={isLoading || checkingConnection || !apiKey.trim()}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
						>
							{checkingConnection ? 'Checking...' : 'Check Connection'}
						</button>
					</div>
				</div>

				<!-- Connection Status -->
				{#if checkingConnection && connectionStatus === 'idle'}
					<div class="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
						<p class="text-zinc-300 text-sm animate-pulse">Checking connection to OpenRouter...</p>
					</div>
				{:else if connectionStatus === 'success'}
					<div class="bg-green-900/50 border border-green-700 rounded-lg p-4">
						<p class="text-green-300 text-sm font-medium">Connection to OpenRouter is successful!</p>
					</div>
				{:else if connectionStatus === 'error'}
					<div class="bg-red-900/50 border border-red-700 rounded-lg p-4">
						<p class="text-red-300 text-sm font-medium">Connection Failed</p>
						<p class="text-red-300 text-xs mt-1">{modelsError}</p>
					</div>
				{/if}
			</div>

			<!-- Optimizer Model Selection -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
				<h3 class="text-xl font-medium text-white mb-2">Optimizer Model</h3>
				<p class="text-text-muted text-sm mb-4">Choose which model to use for prompt optimization. Default is Meta: Llama 3.1 8B Instruct.</p>
				<div class="space-y-4">
					<label for="optimizerModel" class="block text-sm font-medium text-zinc-300 mb-2">Optimizer Model</label>
					<select id="optimizerModel" bind:value={optimizerModel} class="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md focus:ring-2 focus:ring-primary-accent focus:border-primary-accent outline-none transition-colors duration-200 text-zinc-100">
						{#each optimizerModels as model}
							<option value={model.id}>{model.label} — {model.desc}</option>
						{/each}
					</select>
					<div class="flex space-x-3">
						<button onclick={saveOptimizerModel} disabled={!hasOptimizerModelChanges || isLoading} class="px-4 py-2 bg-primary-accent hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed">
							{isLoading ? 'Saving...' : 'Save Optimizer Model'}
						</button>
					</div>
				</div>
			</div>

			<!-- Data Management Section -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
				<div>
					<h3 class="text-xl font-medium text-white mb-2">Data Management</h3>
					<p class="text-text-muted text-sm">
						Export your data for backup, import previously exported data, or completely clear all stored information.
					</p>
				</div>

				<div class="space-y-4">
					<!-- Download Data Button -->
					<div class="flex flex-col space-y-2">
						<button
							onclick={downloadAllData}
							disabled={isLoading}
							class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Exporting...' : 'Download All Data'}
						</button>
						<p class="text-zinc-400 text-xs">
							Exports all your projects, chat history, and settings including API key as a JSON file.
						</p>
					</div>

					<!-- Import Data Button -->
					<div class="flex flex-col space-y-2">
						<input
							type="file"
							accept=".json"
							bind:this={fileInput}
							onchange={importData}
							class="hidden"
						/>
						<button
							onclick={triggerFileInput}
							disabled={isLoading}
							class="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Importing...' : 'Import Data'}
						</button>
						<p class="text-zinc-400 text-xs">
							⚠️ Imports data from a previously exported JSON file. This will replace all existing data.
						</p>
					</div>

					<!-- Clear All Data Button -->
					<div class="flex flex-col space-y-2">
						<button
							onclick={clearAllData}
							disabled={isLoading}
							class="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Clearing...' : 'Clear All Data'}
						</button>
						<p class="text-zinc-400 text-xs">
							⚠️ Permanently deletes all projects, chat history, and settings. This cannot be undone.
						</p>
					</div>
				</div>
			</div>

			<!-- Data Storage Info -->
			<div class="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
				<h3 class="text-lg font-medium text-white mb-3">Data Storage</h3>
				<p class="text-text-muted text-sm">
					All your data, including API keys, projects, and chat history, is stored locally in your browser using IndexedDB. 
					Nothing is sent to external servers except for API calls to OpenRouter when generating content.
				</p>
			</div>
		</div>
	</div>

	<!-- Bottom Attribution -->
	<div class="text-center">
		<p class="text-text-muted text-xs">Powered by Cerebras and OpenRouter API.</p>
	</div>
</div>
