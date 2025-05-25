<script lang="ts">
	import { GripVertical } from "@lucide/svelte";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import type {
		ChatEvent,
		UserChatEvent,
		BotChatEvent,
		ThinkingChatEvent,
		ServerChatEvent,
	} from "$lib/types.js";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { browser } from "$app/environment";

	// Original resizing state
	let leftPanelWidth = $state(70);
	let isResizing = $state(false);
	let containerRef;

	// Chat state
	let messages: ChatEvent[] = $state([]);
	let messageInput = $state("");
	let isLoading = $state(false);
	let messagesContainer: HTMLElement | undefined = $state();
	let generatedHtml = $state("");
	let lastBotRawMessageContent: string | null = $state(null);

	const chatId = $page.params.id;
	const userId = "user-1"; // This should come from authentication

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

	function addUserMessage(content: string, prefix: string = ""): void {
		const userMessage: UserChatEvent = {
			id: generateId(),
			type: "user",
			userId,
			content: prefix ? `${prefix}: ${content}` : content,
			timestamp: new Date(),
		};
		messages = [...messages, userMessage];
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
		const htmlRegex = /(<!DOCTYPE html>[\s\S]*?<\/html>)/i;
		const htmlMatch = rawContent.match(htmlRegex);

		if (htmlMatch && htmlMatch[1]) {
			const extractedHtml = htmlMatch[1].trim();
			// Remove the matched HTML part and any surrounding newlines/whitespace
			let displayText = rawContent.replace(htmlRegex, "").trim();
			
			// If after removing HTML, the display text is empty, provide a default.
			if (!displayText) {
				displayText = "Preview updated. Any further instructions?";
			}
			
			return { html: extractedHtml, displayText: displayText };
		}
		// If no HTML block is found, the entire content is considered display text.
		return { html: null, displayText: rawContent };
	}

	function replaceThinkingWithBotMessage(
		thinkingId: string,
		rawBotContent: string,
	): void {
		lastBotRawMessageContent = rawBotContent;
		const { html: extractedHtml, displayText } = extractAndCleanBotResponse(rawBotContent);

		const botMessage: BotChatEvent = {
			id: generateId(),
			type: "bot",
			content: displayText, // Use cleaned display text
			timestamp: new Date(),
		};

		if (extractedHtml) {
			generatedHtml = extractedHtml;
		}

		messages = messages.map((msg) =>
			msg.id === thinkingId ? botMessage : msg,
		);
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

		const userMessageContent = messageInput.trim();
		messageInput = "";
		isLoading = true;

		// Add user message
		addUserMessage(userMessageContent);
		scrollToBottom();

		// Add thinking indicator
		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			// Build chat history from current messages
			const chatHistory = messages
				.filter(msg => msg.type === "user" || msg.type === "bot")
				.map(msg => ({
					role: msg.type === "user" ? "user" : "assistant" as const,
					content: msg.content
				}));

			// Add the current user message to history
			chatHistory.push({
				role: "user",
				content: userMessageContent
			});

			const response = await fetch('/api/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ chatHistory })
			});

			const result = await response.json();

			if (result.success) {
				// Use the extracted HTML content and raw content for display
				const htmlContent = result.content; // Already extracted HTML
				const rawContent = result.rawContent || result.content; // Full response for context
				
				// Update generatedHtml with the clean HTML
				if (htmlContent && htmlContent.includes('<!DOCTYPE html>')) {
					generatedHtml = htmlContent;
				}
				
				// Replace thinking with bot response using raw content for display
				replaceThinkingWithBotMessage(thinkingId, rawContent);
			} else {
				// Remove thinking and add error message
				messages = messages.filter((msg) => msg.id !== thinkingId);
				addServerMessage(
					`Error: ${result.error || "Failed to get response"}`,
				);
			}
		} catch (error) {
			// Remove thinking and add error message
			messages = messages.filter((msg) => msg.id !== thinkingId);
			addServerMessage(
				"Error: Failed to send message. Please try again.",
			);
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	async function handleRefine(): Promise<void> {
		if (!messageInput.trim() || isLoading || !generatedHtml) return;

		const refineInstruction = messageInput.trim();
		messageInput = ""; // Clear input after initiating refine
		isLoading = true;

		// Add user message for refinement
		addUserMessage(refineInstruction, "Refine");
		scrollToBottom();

		// Add thinking indicator
		const thinkingId = addThinkingMessage();
		scrollToBottom();

		try {
			const response = await fetch('/api/refine', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ 
					originalHtml: generatedHtml, 
					userRequest: refineInstruction 
				})
			});

			const result = await response.json();

			if (result.success && result.content) {
				generatedHtml = result.content; // Update HTML preview with refined content
				// Replace thinking with a success message for refinement
				messages = messages.map((msg) =>
					msg.id === thinkingId
						? ({
								id: generateId(),
								type: "bot",
								content: "Preview updated with refinements. What's next?",
								timestamp: new Date(),
							} as BotChatEvent)
						: msg,
				);
				lastBotRawMessageContent = result.content; // Update last bot content with the new HTML
			} else {
				// Remove thinking and add error message
				messages = messages.filter((msg) => msg.id !== thinkingId);
				addServerMessage(
					`Error refining: ${result.error || "Failed to get refined HTML"}`,
				);
			}
		} catch (error) {
			messages = messages.filter((msg) => msg.id !== thinkingId);
			addServerMessage(
				"Error: Failed to send refine request. Please try again.",
			);
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

	onMount(() => {
		const id = $page.params.id;
		
		// Add welcome message first
		addServerMessage(
			"Welcome to the builder! Describe what you want to build, or use the 'Refine' button with instructions if you have existing HTML.",
		);
		scrollToBottom();
		
		if (id === 'new' && browser) {
			// Read prompt from localStorage
			const storedPrompt = localStorage.getItem('currentPrompt');
			if (storedPrompt) {
				// Clear the localStorage after reading
				localStorage.removeItem('currentPrompt');
				// Set the prompt as input and automatically send it
				messageInput = storedPrompt;
				// Start the chat workflow automatically
				setTimeout(() => {
					handleSendMessage();
				}, 500); // Small delay to ensure UI is ready
			}
		}

		// Cleanup for resize listeners
		return () => {
			document.removeEventListener("mousemove", handleResize);
			document.removeEventListener("mouseup", stopResize);
		};
	});

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
	<title>inja.online</title>
</svelte:head>

<div class="h-screen bg-dark-primary flex flex-col">
	<!-- Header -->
	<Header />

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
				{#if generatedHtml}
					<iframe
						srcdoc={generatedHtml}
						class="w-full h-full border-0"
						title="Generated HTML Preview"
					></iframe>
				{:else}
					<div class="flex items-center justify-center h-full">
						<span class="text-zinc-500">Start a conversation to generate content</span>
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
					Chat {chatId}
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
						disabled={isLoading}
						class="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-400 resize-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						rows="1"
					></textarea>
					<button
						onclick={handleSendMessage}
						disabled={!messageInput.trim() || isLoading}
						class="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
					>
						{isLoading ? "Sending..." : "Send"}
					</button>
					<button
						onclick={handleRefine}
						disabled={!messageInput.trim() || isLoading || !generatedHtml}
						class="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
						title={!generatedHtml ? "Generate some HTML first to enable refine" : "Refine existing HTML"}
					>
						Refine
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
