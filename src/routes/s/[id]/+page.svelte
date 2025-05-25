<script lang="ts">
	import { GripVertical } from "@lucide/svelte";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { projectStorage, chatEventStorage, settingsStorage } from "$lib/storage";
	import { goto } from "$app/navigation";
	import type {
		ChatEvent,
		UserChatEvent,
		BotChatEvent,
		ThinkingChatEvent,
		ServerChatEvent,
		Project,
	} from "$lib/types.js";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { createInitialPage, refinePage } from "$lib/apis/openrouter"; // Import the new client-side functions

	const apiKeyStorageKey = 'openrouter_api_key';

	// Original resizing state
	let leftPanelWidth = $state(70);
	let isResizing = $state(false);
	let containerRef;

	// Chat state
	let messages: ChatEvent[] = $state([]);
	let messageInput = $state("");
	let isLoading = $state(false);
	let messagesContainer: HTMLElement | undefined = $state();
	let generatedHtml = $state("<!-- Start by typing a command to create your page. -->"); // Initialize with a placeholder
	let lastBotRawMessageContent: string | null = $state(null);
	let currentProject: Project | null | undefined = $state(null);

	const projectId = $page.params.id; 
	const userId = "user-1"; 

	// Original resizing functions
	function startResize(e) {
		isResizing = true;
		document.addEventListener("mousemove", handleResize);
		document.addEventListener("mouseup", stopResize);
		e.preventDefault();
	}

	function handleResize(e) {
		if (!isResizing || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const newWidth =
			((e.clientX - containerRect.left) / containerRect.width) * 100;

		// Constrain between 30% and 85%
		leftPanelWidth = Math.min(Math.max(newWidth, 30), 85);
	}

	function stopResize() {
		isResizing = false;
		document.removeEventListener("mousemove", handleResize);
		document.removeEventListener("mouseup", stopResize);
	}

	// Chat functions
	function generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async function storeAndAddUserMessage(content: string, prefix: string = ""): Promise<void> {
		const userMessage: UserChatEvent = {
			id: generateId(),
			type: "user",
			userId,
			content: prefix ? `${prefix}: ${content}` : content,
			timestamp: new Date(),
			projectId: projectId,
		};
		messages = [...messages, userMessage];
		try {
			await chatEventStorage.store(userMessage, projectId);
		} catch (error) {
			console.error("Failed to store user message:", error);
			// Optionally, add a server message indicating storage failure
		}
	}

	function addThinkingMessage(): string {
		const thinkingMessage: ThinkingChatEvent = {
			id: generateId(),
			type: "thinking",
			timestamp: new Date(),
		};
		messages = [...messages, thinkingMessage];
		return thinkingMessage.id;
	}

	function extractAndCleanBotResponse(rawContent: string): { html: string | null; displayText: string } {
		// Assuming rawContent from createInitialPage and refinePage is already clean HTML
		// If it might contain other text, this function might need to be more robust
		// For now, assume it's primarily HTML.
		const isHtml = rawContent.toLowerCase().includes('<!doctype html>') || rawContent.toLowerCase().includes('<html');
		if (isHtml) {
			return { html: rawContent, displayText: "Preview updated. What's next?" };
		}
		// If not clearly HTML, treat as plain text response
		return { html: null, displayText: rawContent };
	}

	async function storeAndReplaceThinkingWithBotMessage(
		thinkingId: string,
		rawBotContent: string,
		isRefinement: boolean = false,
	): Promise<void> {
		lastBotRawMessageContent = rawBotContent;
		// Use a simpler display text since the rawBotContent is now expected to be mostly HTML
		const displayText = isRefinement ? "Preview refined. Any further instructions?" : "Page created/updated. What's next?";

		const botMessage: BotChatEvent = {
			id: generateId(), 
			type: "bot",
			content: displayText,
			rawContent: rawBotContent, 
			timestamp: new Date(),
			projectId: projectId,
		};

		// The rawBotContent itself is the HTML for createInitialPage and refinePage
		generatedHtml = rawBotContent;


		messages = messages.map((msg) =>
			msg.id === thinkingId ? botMessage : msg,
		);
		
		try {
			await chatEventStorage.store(botMessage, projectId);
			if (currentProject?.id) {
				await projectStorage.update(currentProject.id, { htmlContent: generatedHtml });
			}
		} catch (error) {
			console.error("Failed to store bot message or update project:", error);
			addServerMessage("Error: Could not save changes.");
		}
	}

	function addServerMessage(content: string): void {
		const serverMessage: ServerChatEvent = {
			id: generateId(),
			type: "server",
			content,
			timestamp: new Date(),
		};
		messages = [...messages, serverMessage];
	}

	function scrollToBottom(): void {
		if (messagesContainer) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 10);
		}
	}

	async function handleSendMessage(): Promise<void> {
		if (!messageInput.trim() || isLoading) return;
		if (!await checkApiKey()) return;

		const userMessageContent = messageInput.trim();
		messageInput = "";
		isLoading = true;

		await storeAndAddUserMessage(userMessageContent);
		scrollToBottom();

		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			// Call client-side API for creating initial page
			const newHtmlContent = await createInitialPage(userMessageContent);
			
			await storeAndReplaceThinkingWithBotMessage(thinkingId, newHtmlContent, false);

		} catch (error: any) {
			messages = messages.filter((msg) => msg.id !== thinkingId);
			const errorMsg = error.message || "Failed to create page. Please try again.";
			addServerMessage(`Error: ${errorMsg}`);
			console.error("Create page error:", error);
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	async function handleRefine(): Promise<void> {
		if (!messageInput.trim() || isLoading || !generatedHtml) return;
		if (!await checkApiKey()) return;

		const refineInstruction = messageInput.trim();
		messageInput = ""; 
		isLoading = true;

		await storeAndAddUserMessage(refineInstruction, "Refine");
		scrollToBottom();

		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			// Call client-side API for refining content
			const refinedHtmlContent = await refinePage(generatedHtml, refineInstruction);

			await storeAndReplaceThinkingWithBotMessage(thinkingId, refinedHtmlContent, true);
			
		} catch (error: any) {
			messages = messages.filter((msg) => msg.id !== thinkingId);
			const errorMsg = error.message || "Failed to refine page. Please try again.";
			addServerMessage(`Error refining: ${errorMsg}`);
			console.error("Refine page error:", error);
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	function handleKeyPress(event: KeyboardEvent): void {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}

	function formatTime(timestamp: Date): string {
		return timestamp.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Remove project, currentHtmlContent, userRequest state variables as they are covered by currentProject and generatedHtml
	// let project = $state<Project | null>(null); // Covered by currentProject
	// let currentHtmlContent = $state(""); // Covered by generatedHtml
	// let userRequest = $state(""); // Covered by messageInput for chat
	let errorMessage = $state(""); // Keep for API key errors or general page errors
	let showApiKeyModal = $state(false);

	async function checkApiKey() {
		const storedKey = await settingsStorage.getSetting<string>(apiKeyStorageKey);
		if (!storedKey) {
			// Option 1: Redirect to API key page
			// await goto('/ask-for-api-key');
			// Option 2: Show a modal or message on this page
			showApiKeyModal = true;
			errorMessage = 'OpenRouter API Key is not set. Please configure it in settings.';
			return false;
		}
		showApiKeyModal = false;
		errorMessage = '';
		return true;
	}

	onMount(async () => {
		if (!await checkApiKey()) {
			// If API key is not present, we might want to disable input or guide user
			// For now, it shows a modal and error message.
		}

		// Load chat history for the project
		const loadedMessages = await chatEventStorage.getByProject(projectId);
		messages = loadedMessages;
		scrollToBottom();


		if (projectId) {
			const loadedProject = await projectStorage.get(projectId);
			if (loadedProject) {
				currentProject = loadedProject;
				// Initialize generatedHtml from the project's stored content
				// If there are bot messages with rawContent, the last one might be more up-to-date.
				// For simplicity, using project.htmlContent first.
				generatedHtml = loadedProject.htmlContent || "<!-- Start by typing a command to create your page. -->";
				
				// Find the latest bot message with raw HTML content to ensure UI consistency
				const lastBotMessageWithHtml = messages
					.slice()
					.reverse()
					.find(msg => msg.type === 'bot' && (msg as BotChatEvent).rawContent && (msg as BotChatEvent).rawContent.includes('<!DOCTYPE html>')) as BotChatEvent | undefined;

				if (lastBotMessageWithHtml?.rawContent) {
					generatedHtml = lastBotMessageWithHtml.rawContent;
				}


			} else {
				errorMessage = 'Project not found.';
				// Optionally redirect or handle. For now, user can still chat to create a new page if project ID was for a new one.
				// Or, if project must exist:
				// await goto('/'); 
			}
		}
		// Ensure messages container scrolls to bottom after messages and project loaded
		scrollToBottom();
	});

	// Remove handleRefineRequest as its functionality is covered by handleRefine via chat
	/*
	async function handleRefineRequest() {
		// ... This function is no longer needed ...
	}
	*/

	// Use generatedHtml for iframeSrcDoc directly
	let iframeSrcDoc = $derived(generatedHtml);

	function startBuilding() {
		if (!messageInput.trim()) return;
		
		isLoading = true;
		try {
			// TODO: Implement your building logic here
			// This could be an API call to generate the website
			console.log('Building with prompt:', messageInput);
			
			// Simulated building process
			setTimeout(() => {
				addServerMessage('Website built successfully!');
				isLoading = false;
				scrollToBottom();
			}, 2000);
		} catch (error) {
			console.error('Building failed:', error);
			addServerMessage('Building failed. Please try again.');
			isLoading = false;
			scrollToBottom();
		}
	}
</script>

<svelte:head>
	<title>{currentProject ? currentProject.name : 'inja.online'}</title>
</svelte:head>

<div class="flex flex-col h-screen bg-zinc-900 text-white">
	{#if showApiKeyModal}
		<div class="p-4 bg-red-700 text-center">
			{errorMessage} <a href="/ask-for-api-key" class="underline hover:text-zinc-300">Set API Key</a>
		</div>
	{/if}

	<!-- Header -->
	<Header project={currentProject} />

	<!-- Main Content Layout -->
	<div class="flex flex-1 overflow-hidden" bind:this={containerRef}>
		<!-- Main Content Pane (Left) -->
		<div
			class="bg-dark-secondary border-r border-primary-accent flex flex-col"
			style="width: {leftPanelWidth}%"
		>
			<div class="p-6 border-b border-primary-accent">
				<span class="text-white font-medium">Preview</span>
			</div>

			<!-- Iframe Container -->
			<div
				class="flex-1 bg-white m-6 border border-primary-accent rounded-md overflow-hidden"
			>
				{#if generatedHtml && generatedHtml.trim() !== "<!-- Start by typing a command to create your page. -->" && generatedHtml.trim() !== ""}
					<iframe
						srcdoc={iframeSrcDoc}
						class="w-full h-full border-0"
						title="Generated HTML Preview"
						sandbox="allow-scripts allow-same-origin"
					></iframe>
				{:else}
					<div class="flex items-center justify-center h-full">
						<span class="text-zinc-500">{ generatedHtml.includes("Start by typing") ? "Start by typing a command to create your page." : "No preview available. Generate content via chat."}</span>
					</div>
				{/if}
			</div>

			<!-- Attribution -->
			<Footer />
		</div>

		<!-- Resize Handle -->
		<div
			class="w-1 bg-primary-accent hover:bg-secondary-accent cursor-col-resize flex items-center justify-center group"
			class:bg-secondary-accent={isResizing}
			onmousedown={startResize}
			role="separator"
			tabindex="0"
		>
			<GripVertical
				class="w-3 h-6 text-dark-primary group-hover:text-dark-secondary transition-colors"
			/>
		</div>

		<!-- Chat Sidebar (Right) -->
		<div class="flex-1 flex flex-col">
			<!-- Header -->
			<header class="border-b border-zinc-800 p-4">
				<h1 class="text-xl font-semibold text-zinc-100">
					{currentProject ? currentProject.name : `Chat ${projectId}`}
				</h1>
			</header>

			<!-- Messages Container -->
			<div
				bind:this={messagesContainer}
				class="flex-1 overflow-y-auto p-4 space-y-4"
			>
				{#each messages as message (message.id)}
					<div class="flex flex-col space-y-2">
						{#if message.type === "user"}
							<div class="flex justify-end">
								<div
									class="bg-zinc-700 rounded-lg px-4 py-2 max-w-md"
								>
									<p class="text-zinc-100">
										{message.content}
									</p>
									<span
										class="text-xs text-zinc-400 mt-1 block"
									>
										{formatTime(message.timestamp)}
									</span>
								</div>
							</div>
						{:else if message.type === "bot"}
							<div class="flex justify-start">
								<div
									class="bg-zinc-800 rounded-lg px-4 py-2 max-w-md border border-zinc-700"
								>
									<p class="text-zinc-100">
										{message.content}
									</p>
									<span
										class="text-xs text-zinc-400 mt-1 block"
									>
										{formatTime(message.timestamp)}
									</span>
								</div>
							</div>
						{:else if message.type === "thinking"}
							<div class="flex justify-start">
								<div
									class="bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700"
								>
									<div class="flex items-center space-x-2">
										<div class="flex space-x-1">
											<div
												class="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"
											></div>
											<div
												class="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"
												style="animation-delay: 0.2s"
											></div>
											<div
												class="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"
												style="animation-delay: 0.4s"
											></div>
										</div>
										<span class="text-zinc-400 text-sm"
											>Thinking...</span
										>
									</div>
								</div>
							</div>
						{:else if message.type === "server"}
							<div class="flex justify-center">
								<div
									class="bg-zinc-900 rounded-lg px-3 py-1 text-sm text-zinc-400 border border-zinc-800"
								>
									{message.content}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Input Area -->
			<div class="border-t border-zinc-800 p-4">
				<div class="flex space-x-3">
					<textarea
						bind:value={messageInput}
						onkeypress={handleKeyPress}
						placeholder="Type your message or refinement instruction..."
						disabled={isLoading || showApiKeyModal}
						class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-400 resize-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						rows="1"
					></textarea>
					<button
						onclick={handleSendMessage}
						disabled={!messageInput.trim() || isLoading || showApiKeyModal}
						class="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
					>
						{isLoading ? "Sending..." : "Send"}
					</button>
					<button
						onclick={handleRefine}
						disabled={!messageInput.trim() || isLoading || !generatedHtml || generatedHtml.includes("Start by typing") || showApiKeyModal}
						class="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
						title={(!generatedHtml || generatedHtml.includes("Start by typing")) ? "Generate some HTML first to enable refine" : "Refine existing HTML"}
					>
						Refine
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- 
  Consider adding a modal component for API key input if `showApiKeyModal` is true,
  or ensure the /ask-for-api-key route is functional for users to input their key.
-->
