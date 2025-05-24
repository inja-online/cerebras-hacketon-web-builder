<script lang="ts">
	import { GripVertical } from "@lucide/svelte";
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { sendChatMessage } from "$lib/api.js";
	import type {
		ChatEvent,
		UserChatEvent,
		BotChatEvent,
		ThinkingChatEvent,
		ServerChatEvent,
	} from "$lib/types.js";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";

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

	function addUserMessage(content: string): void {
		const userMessage: UserChatEvent = {
			id: generateId(),
			type: "user",
			userId,
			content,
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

	function extractHtmlFromResponse(content: string): string {
		const htmlMatch = content.match(/\$\$\$HTML\$\$\$([\s\S]*?)\$\$\$HTML\$\$\$/);
		return htmlMatch ? htmlMatch[1].trim() : "";
	}

	function replaceThinkingWithBotMessage(
		thinkingId: string,
		content: string,
	): void {
		const botMessage: BotChatEvent = {
			id: generateId(),
			type: "bot",
			content,
			timestamp: new Date(),
		};

		// Extract HTML if present
		const htmlContent = extractHtmlFromResponse(content);
		if (htmlContent) {
			generatedHtml = htmlContent;
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
			// Send message to API
			const response = await sendChatMessage(userMessageContent, chatId);

			if (response.success) {
				// Replace thinking with bot response
				replaceThinkingWithBotMessage(thinkingId, response.content);
			} else {
				// Remove thinking and add error message
				messages = messages.filter((msg) => msg.id !== thinkingId);
				addServerMessage(
					`Error: ${response.error || "Failed to get response"}`,
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
		// Add welcome message
		addServerMessage("Welcome to the chat! Type a message to get started.");
		scrollToBottom();

		// Cleanup for resize listeners
		return () => {
			document.removeEventListener("mousemove", handleResize);
			document.removeEventListener("mouseup", stopResize);
		};
	});
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
						placeholder="Type your message..."
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
				</div>
			</div>
		</div>
	</div>
</div>
