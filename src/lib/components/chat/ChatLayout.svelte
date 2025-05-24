<script lang="ts">
	import { Send, MessageCircle } from "@lucide/svelte";
	import ChatMessages from "./ChatMessages.svelte";
	import type { ChatEvent } from "../../types";

	let message = $state("");
	let events: ChatEvent[] = $state([
		{
			id: "1",
			type: "server",
			content: "Welcome to inja.online! How can we help you today?",
			timestamp: new Date()
		}
	]);

	function handleSendMessage() {
        console.log("Sending message:", message);
		if (!message.trim()) return;
		
		const userMessage: ChatEvent = {
			id: Date.now().toString(),
			type: "user",
			userId: "user",
			content: message.trim(),
			timestamp: new Date()
		};
		
		events = [...events, userMessage];
		message = "";
		
		// Simulate bot response
		setTimeout(() => {
			const botMessage: ChatEvent = {
				id: (Date.now() + 1).toString(),
				type: "bot",
				content: "Thanks for your message! This is a demo response.",
				timestamp: new Date()
			};
			events = [...events, botMessage];
		}, 1000);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}
</script>

<div class="flex-1 bg-dark-secondary flex flex-col" style="min-width: 320px">
	<!-- Chat Header -->
	<div class="p-6 border-b border-primary-accent flex items-center justify-between">
		<div class="flex items-center gap-2">
			<MessageCircle class="w-5 h-5 text-primary-accent" />
			<span class="text-white font-medium">chat</span>
		</div>
		<span class="text-sm text-secondary-accent">contact us :)</span>
	</div>

	<!-- Chat Messages -->
	<ChatMessages {events} />

	<!-- Chat Input -->
	<div class="p-6 pt-0 space-y-3">
		<textarea
			bind:value={message}
			onkeydown={handleKeyDown}
			class="w-full h-20 bg-dark-primary border border-primary-accent rounded-md p-3 text-white placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary-accent/50 transition-all"
			placeholder="Type your message..."
		></textarea>

		<button class="button w-full" onclick={handleSendMessage}>
			<span class="text_button">Send Message</span>
			<Send class="sparkle w-4 h-4" />
			<div class="dots_border"></div>
		</button>
	</div>
</div>
