<script lang="ts">
	import { Send, MessageCircle } from "@lucide/svelte";
	import ChatMessages from "./ChatMessages.svelte";
	import type { ChatEvent } from "../../types";
	import { onMount } from 'svelte';
	import { settingsStorage } from '$lib/storage';

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

	let chatModel = $state('meta-llama/llama-4-scout');
	let originalChatModel = $state('meta-llama/llama-4-scout');
	const chatModelStorageKey = 'chat_model';

	const chatModels = [
	{
		id: 'meta-llama/llama-3.1-8b-instruct',
		label: 'Llama 3.1 8B Instruct',
		desc: 'Fast, efficient. 131K ctx.'
	},
	{
		id: 'qwen/qwen3-32b',
		label: 'Qwen3 32B',
		desc: 'Dense 32.8B, 131K ctx.'
	},
	{
		id: 'meta-llama/llama-4-scout',
		label: 'Llama 4 Scout',
		desc: '17B MoE, 10M ctx.'
	},
	{
		id: 'deepseek/deepseek-r1-distill-llama-70b',
		label: 'DeepSeek R1 Distill Llama 70B',
		desc: 'Distilled 70B, 128K ctx.'
	},
	{
		id: 'meta-llama/llama-3.3-70b-instruct',
		label: 'Llama 3.3 70B Instruct',
		desc: 'Multilingual, 131K ctx.'
	}
];

	onMount(async () => {
		const storedChatModel = await settingsStorage.getSetting<string>(chatModelStorageKey);
		if (storedChatModel) {
			chatModel = storedChatModel;
			originalChatModel = storedChatModel;
		}
	});

	const hasChatModelChanges = $derived(chatModel !== originalChatModel);

	async function saveChatModel() {
		await settingsStorage.setSetting(chatModelStorageKey, chatModel);
		originalChatModel = chatModel;
	}

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

<div class="flex-1 bg-dark-secondary flex flex-col h-full">
	<!-- Chat Model Selection -->
	<div class="w-full max-w-md mx-auto mb-4">
		<label for="chatModel" class="block text-xs font-medium text-zinc-400 mb-1 tracking-wide">Chat Model</label>
		<p class="text-xs text-zinc-500 mb-2">Choose which AI model powers your chat. Each model has different strengths and context limits.</p>
		<div class="relative flex gap-2 items-center">
			<select
				id="chatModel"
				bind:value={chatModel}
				class="w-full px-4 py-2.5 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:ring-2 focus:ring-primary-accent focus:border-primary-accent outline-none transition-colors duration-200 appearance-none shadow-sm hover:border-primary-accent/60"
			>
				{#each chatModels as model}
					<option value={model.id}>{model.label} — {model.desc}</option>
				{/each}
			</select>
			<!-- Custom dropdown arrow -->
			<svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
			{#if hasChatModelChanges}
				<button onclick={saveChatModel} class="px-3 py-1 bg-primary-accent text-white rounded-md text-xs hover:bg-zinc-600 transition-colors duration-200 shadow">Save</button>
			{/if}
		</div>
	</div>
	<!-- Chat Messages -->
	<ChatMessages {events} />
</div>
