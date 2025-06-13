<script lang="ts">
	import { Send, MessageCircle } from "@lucide/svelte";
	import ChatMessages from "./ChatMessages.svelte";
	import type { ChatEvent } from "../../types";
	import { onMount } from 'svelte';
	import { settingsStorage } from '$lib/storage';

	let message = $state("");
	// Changed events to be an input prop with a default value
	let {
		events = [
			{
				id: "1",
				type: "server",
				content: "Welcome to inja.online! How can we help you today?",
				timestamp: new Date(),
			},
		],

		onDownloadHtmlFromMessage,
		onRevertToHtmlFromMessage,
		onRetryFromMessage,
	}: {
		events?: ChatEvent[];
		onDownloadHtmlFromMessage?: (
			htmlContent: string,
			messageId: string,
		) => void;
		onRevertToHtmlFromMessage?: (htmlContent: string) => void;
		onRetryFromMessage?: (botMessageId: string) => void;
	} = $props();

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
			timestamp: new Date(),
		};

		events = [...events, userMessage];
		message = "";

		// Simulate bot response
		setTimeout(() => {
			const botMessage: ChatEvent = {
				id: (Date.now() + 1).toString(),
				type: "bot",
				content: "Thanks for your message! This is a demo response.",
				timestamp: new Date(),
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
	
	<!-- Chat Messages -->
	<ChatMessages {events} 
		onDownloadHtmlFromMessage={onDownloadHtmlFromMessage}
		onRevertToHtmlFromMessage={onRevertToHtmlFromMessage} 
		onRetryFromMessage={onRetryFromMessage} />
</div>
