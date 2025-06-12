<script lang="ts">
	import Label from '$lib/components/ui/label.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { settingsStorage, selectedModelKey, selectedProviderKey } from '$lib/storage';
	import { onMount } from 'svelte';

	const availableModels = $state([
		{ provider: 'Cerebras', value: 'qwen/qwen3-32b', label: 'Qwen3 32B (Cerebras)' },
		{ provider: 'Cerebras', value: 'meta-llama/llama-4-scout', label: 'Llama 4 Scout (Cerebras)' },
        { provider: 'deepinfra/fp8', value: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick (Parasail FP8)' },
	]);

	let selectedModelValue = $state(availableModels[0].value); // Default to the first model
	
	// Props to communicate selection back if needed, or rely on settingsStorage
	let { 
		value = $bindable(selectedModelValue),
	}: { value?: string } = $props();


	$effect(() => {
		value = selectedModelValue;
		const currentSelection = availableModels.find(m => m.value === selectedModelValue);
		if (currentSelection) {
			settingsStorage.setSetting(selectedModelKey, currentSelection.value);
			settingsStorage.setSetting(selectedProviderKey, currentSelection.provider);
		}
	});

	onMount(async () => {
		const storedModel = await settingsStorage.getSetting<string>(selectedModelKey);
		const storedProvider = await settingsStorage.getSetting<string>(selectedProviderKey); // Though provider is fixed per model here
		if (storedModel && availableModels.some(m => m.value === storedModel)) {
			selectedModelValue = storedModel;
		} else {
			// If no stored model or invalid, set to default and save
			const defaultSelection = availableModels[0];
			selectedModelValue = defaultSelection.value;
			await settingsStorage.setSetting(selectedModelKey, defaultSelection.value);
			await settingsStorage.setSetting(selectedProviderKey, defaultSelection.provider);
		}
	});

	const selectedModelDetails = $derived(availableModels.find((i) => i.value === selectedModelValue));
	const uid = "model-select-" + crypto.randomUUID().substring(0,8);
</script>

<div class="space-y-1 flex flex-row justify-center items-center">
	<Select.Root type="single" bind:value={selectedModelValue}>
		<Select.Trigger id={uid} class="w-full bg-zinc-800 border-zinc-700 text-zinc-100 h-9 text-xs">
			{selectedModelDetails?.label ?? 'Select a model'}
		</Select.Trigger>
		<Select.Content
			class="[&_*[data-select-item]>span]:end-2 [&_*[data-select-item]>span]:start-auto [&_*[data-select-item]]:pe-8 [&_*[data-select-item]]:ps-2 bg-zinc-800 border-zinc-700 text-zinc-100"
		>
			{#each availableModels as item (item.value)}
				<Select.Item value={item.value} class="text-xs hover:bg-zinc-700 focus:bg-zinc-700 data-[state=checked]:bg-zinc-600">
					{item.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>
