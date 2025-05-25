<script lang="ts">
	import { onMount } from 'svelte';
	import { settingsStorage } from '$lib/storage'; // Import settingsStorage
	import { goto } from '$app/navigation'; // Import goto

	let apiKey = '';
	const apiKeyStorageKey = 'openrouter_api_key'; // Key for IndexedDB

	onMount(async () => {
		const storedKey = await settingsStorage.getSetting<string>(apiKeyStorageKey);
		if (storedKey) {
			apiKey = storedKey;
			await goto('/', { replaceState: true }); // Redirect if key already exists
		}
	});

	async function saveApiKey() {
		if (apiKey.trim()) {
			try {
				await settingsStorage.setSetting(apiKeyStorageKey, apiKey.trim());
				alert('API Key saved successfully!');
				await goto('/', { replaceState: true }); // Redirect after saving
			} catch (error) {
				console.error('Failed to save API key:', error);
				alert('Failed to save API Key. See console for details.');
			}
		} else {
			alert('Please enter a valid API Key.');
		}
	}
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-zinc-100 p-4">
	<div class="bg-zinc-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md space-y-8">
		<header class="text-center">
			<h1 class="text-2xl sm:text-3xl font-semibold text-white">Welcome & API Key Setup</h1>
		</header>

		<section class="space-y-6">
			<p class="text-sm sm:text-base text-zinc-300 text-center">
				This is a mock website builder that uses Large Language Models (LLMs) to help you create web pages.
				To power these AI features, specifically the Cerebras Qwen models, an API key from
				<a
					href="https://openrouter.ai/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sky-400 hover:text-sky-300 underline"
				>
					OpenRouter.ai
				</a>
				is required.
			</p>
			<p class="text-sm text-zinc-400 text-center">
				Please visit their website, obtain your API key, and enter it below.
			</p>
		</section>

		<form onsubmit={saveApiKey} class="space-y-8">
			<div>
				<label for="apiKey" class="block text-sm font-medium text-zinc-300 mb-2">
					OpenRouter API Key
				</label>
				<input
					type="password"
					id="apiKey"
					name="apiKey"
					bind:value={apiKey}
					placeholder="sk-or-..."
					class="w-full px-4 py-2.5 bg-zinc-700 border border-zinc-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors duration-200 text-zinc-100 placeholder-zinc-400"
					required
				/>
			</div>

			<button
				type="submit"
				class="w-full px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-200"
			>
				Save API Key
			</button>
		</form>
	</div>
	<p class="text-xs sm:text-sm text-zinc-500 text-center pt-4 max-w-md">
		Important: This application stores everything, including your API key and chat history,
		locally in your browser. There is no server-side storage or syncing of your data.
	</p>
</div>