<script lang="ts">
	import { GripVertical, Settings, Download } from "@lucide/svelte";
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
			isSent: true, // Mark as sent since it will be processed immediately
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

	function extractAndCleanBotResponse(rawContent: string): { 
		html: string | null; 
		displayText: string; 
		originalMessage: string 
	} {
		const originalMessage = rawContent;
		
		// Look for HTML document structure
		const htmlStartRegex = /<!doctype\s+html[^>]*>|<html[^>]*>/i;
		const htmlEndRegex = /<\/html\s*>/i;
		
		const htmlStartMatch = rawContent.match(htmlStartRegex);
		const htmlEndMatch = rawContent.match(htmlEndRegex);
		
		if (htmlStartMatch && htmlEndMatch) {
			const htmlStartIndex = htmlStartMatch.index!;
			const htmlEndIndex = htmlEndMatch.index! + htmlEndMatch[0].length;
			
			// Extract the HTML content
			const htmlContent = rawContent.substring(htmlStartIndex, htmlEndIndex);
			
			// Extract the text before and after HTML
			const beforeHtml = rawContent.substring(0, htmlStartIndex).trim();
			const afterHtml = rawContent.substring(htmlEndIndex).trim();
			
			// Combine non-HTML parts as display message
			let displayText = [beforeHtml, afterHtml].filter(text => text.length > 0).join('\n\n');
			
			// If no display text, provide a default message
			if (!displayText) {
				displayText = "Preview updated. What's next?";
			}
			
			return { 
				html: htmlContent, 
				displayText, 
				originalMessage 
			};
		}
		
		// If no HTML found, treat entire content as display text
		return { 
			html: null, 
			displayText: rawContent, 
			originalMessage 
		};
	}

	async function storeAndReplaceThinkingWithBotMessage(
		thinkingId: string,
		rawBotContent: string,
		isRefinement: boolean = false,
	): Promise<void> {
		lastBotRawMessageContent = rawBotContent;
		
		// Parse the bot response to separate HTML and display message
		const { html, displayText, originalMessage } = extractAndCleanBotResponse(rawBotContent);
		
		// Use the extracted display text or provide a default
		const finalDisplayText = displayText || (isRefinement ? "Preview refined. Any further instructions?" : "Page created/updated. What's next?");

		const botMessage: BotChatEvent = {
			id: generateId(), 
			type: "bot",
			content: finalDisplayText,
			rawContent: rawBotContent,
			htmlContent: html || undefined,
			originalMessage,
			timestamp: new Date(),
			projectId: projectId,
		};

		// Update the preview with HTML content if available
		if (html) {
			generatedHtml = html;
		}

		messages = messages.map((msg) =>
			msg.id === thinkingId ? botMessage : msg,
		);
		
		try {
			await chatEventStorage.store(botMessage, projectId);
			if (currentProject?.id && html) {
				await projectStorage.update(currentProject.id, { htmlContent: html });
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

		await storeAndAddUserMessage(userMessageContent);
		scrollToBottom();

		isLoading = true;
		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			let newHtmlContent: string;
			
			// Determine if we should create a new page or refine existing content
			const hasExistingContent = generatedHtml && 
				generatedHtml.trim() !== "<!-- Start by typing a command to create your page. -->" && 
				generatedHtml.trim() !== "";

			if (hasExistingContent) {
				// If there's existing HTML content, refine it
				newHtmlContent = await refinePage(generatedHtml, userMessageContent);
				await storeAndReplaceThinkingWithBotMessage(thinkingId, newHtmlContent, true);
			} else {
				// If no existing content, create a new page
				newHtmlContent = await createInitialPage(userMessageContent);
				await storeAndReplaceThinkingWithBotMessage(thinkingId, newHtmlContent, false);
			}

		} catch (error: any) {
			messages = messages.filter((msg) => msg.id !== thinkingId);
			const errorMsg = error.message || "Failed to process request. Please try again.";
			addServerMessage(`Error: ${errorMsg}`);
			console.error("API request error:", error);
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

	async function triggerInitialPageGeneration(initialPromptContent: string) {
		if (isLoading) return; // Prevent multiple triggers
		isLoading = true;
		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			addServerMessage("Auto-generating initial page based on your prompt...");
			scrollToBottom();
			const newHtmlContent = await createInitialPage(initialPromptContent);
			await storeAndReplaceThinkingWithBotMessage(thinkingId, newHtmlContent, false);
		} catch (error: any) {
			messages = messages.filter((msg) => msg.id !== thinkingId); // Remove thinking message on error
			const errorMsg = error.message || "Failed to auto-generate initial page. Please try again.";
			addServerMessage(`Error: ${errorMsg}`);
			console.error("Auto-generate initial page error:", error);
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	async function markUserMessageAsSent(messageId: string): Promise<void> {
		try {
			await chatEventStorage.update(messageId, { isSent: true });
			// Update local messages array
			messages = messages.map(msg => 
				msg.id === messageId && msg.type === 'user' 
					? { ...msg, isSent: true } 
					: msg
			);
		} catch (error) {
			console.error("Failed to mark message as sent:", error);
		}
	}

	onMount(async () => {
		if (!await checkApiKey()) {
			// API key not present, modal shown by checkApiKey
		}

		const loadedProject = await projectStorage.get(projectId);
		if (loadedProject) {
			currentProject = loadedProject;
			generatedHtml = loadedProject.htmlContent || "<!-- Start by typing a command to create your page. -->";
		} else {
			errorMessage = 'Project not found. You can start a new one by typing a description.';
			// Potentially redirect or allow creation if it's a truly new ID not yet in DB
			// For now, we assume MainPageInput creates the project entry first.
		}
		
		// Load chat history for the project
		const loadedMessages = await chatEventStorage.getByProject(projectId);
		messages = loadedMessages;
		

		// Check for unsent user messages and process them
		const unsentUserMessages = messages.filter(msg => 
			msg.type === 'user' && !(msg as UserChatEvent).isSent
		) as UserChatEvent[];

		if (unsentUserMessages.length > 0 && await checkApiKey()) {
			// Process the first unsent message (usually the initial prompt)
			const firstUnsentMessage = unsentUserMessages[0];
			await markUserMessageAsSent(firstUnsentMessage.id);
			await triggerInitialPageGeneration(firstUnsentMessage.content);
		} else if (currentProject?.htmlContent && currentProject.htmlContent !== "<!-- Start by typing a command to create your page. -->") {
			// If there's existing HTML content in the project, ensure the preview reflects it,
			// especially if chat history might have a more recent bot message with HTML.
			const lastBotMessageWithHtml = messages
				.slice()
				.reverse()
				.find(msg => msg.type === 'bot' && (msg as BotChatEvent).htmlContent) as BotChatEvent | undefined;

			if (lastBotMessageWithHtml?.htmlContent) {
				generatedHtml = lastBotMessageWithHtml.htmlContent;
			} else {
				generatedHtml = currentProject.htmlContent;
			}
		}
		
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

	function handleDownloadHtml() {
		if (!generatedHtml || generatedHtml.trim() === "<!-- Start by typing a command to create your page. -->" || generatedHtml.trim() === "") {
			addServerMessage("Nothing to download. Generate some content first.");
			return;
		}
		const blob = new Blob([generatedHtml], { type: 'text/html' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'index.html';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
		addServerMessage("HTML content downloaded as index.html");
	}

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
	<div class="flex justify-between items-center p-4 border-b border-zinc-800">
		<div class="flex items-center space-x-4">
			<Header project={currentProject} />
		</div>
		<a href="/settings" class="text-zinc-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-2">
			<Settings size={16} />
			Settings
		</a>
	</div>

	<!-- Main Content Layout -->
	<div class="flex flex-1 overflow-hidden" bind:this={containerRef}>
		<!-- Main Content Pane (Left) -->
		<div
			class="bg-dark-secondary border-r border-primary-accent flex flex-col"
			style="width: {leftPanelWidth}%"
		>
			<div class="p-6 border-b border-primary-accent flex justify-between items-center">
				<span class="text-white font-medium">Preview</span>
				<button
					onclick={handleDownloadHtml}
					disabled={!generatedHtml || generatedHtml.includes("Start by typing")}
					class="text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors duration-200"
					title={(!generatedHtml || generatedHtml.includes("Start by typing")) ? "Generate content to enable download" : "Download HTML"}
				>
					<Download size={20} />
				</button>
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
