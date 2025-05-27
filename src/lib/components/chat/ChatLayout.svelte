<script lang="ts">
	import { Send, MessageCircle } from "@lucide/svelte";
	import ChatMessages from "./ChatMessages.svelte";
	import type { ChatEvent } from "../../types";

	let message = $state("");
	// Changed events to be an input prop with a default value
	let { events = [
		{
			id: "1",
			type: "server",
			content: "Welcome to inja.online! How can we help you today?",
			timestamp: new Date()
		}
	] }: { events?: ChatEvent[] } = $props();

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

<div class="flex-1 bg-dark-secondary flex flex-col">
	<!-- Chat Messages -->
	<ChatMessages {events} />
	
</div>
