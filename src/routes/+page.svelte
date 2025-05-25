<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { settingsStorage } from '$lib/storage';
  import MainPageInput from '$lib/components/MainPageInput.svelte';
  import RecentProjects from '$lib/components/RecentProjects.svelte';
	const apiKeyStorageKey = 'openrouter_api_key';
	let apiKeyPresent = false; // Use a reactive variable to conditionally render content

	onMount(async () => {
		const storedKey = await settingsStorage.getSetting<string>(apiKeyStorageKey);
		if (!storedKey) {
			await goto('/ask-for-api-key', { replaceState: true });
		} else {
			apiKeyPresent = true;
		}
	});
</script>

<div class="min-h-screen bg-dark-primary text-white p-8 flex flex-col">
	{#if apiKeyPresent}
    <!-- Top Section with Brand and Blog Link -->
    <div class="flex justify-between items-start mb-16">
      <a href="https://inja.online" target="_blank" class="text-2xl font-medium text-primary-accent tracking-wide">INJA.ONLINE</a>
      <a href="#" class="text-sm text-primary-accent hover:text-white transition-colors duration-200">
        read the blog on how we build this
      </a>
    </div>
  
    <!-- Main Content Container -->
    <div class="flex-1 flex items-center justify-center">
      <div class="w-full max-w-2xl space-y-12">
        <!-- Minimal Headline -->
        <h2 class="text-3xl font-light text-white text-center">
          Build the web together
        </h2>
  
        <!-- Simplified Input Area -->
        <MainPageInput />
  
        <!-- Recent Projects Section -->
        <RecentProjects />
      </div>
    </div>
  
    <!-- Bottom Attribution -->
    <div class="text-center">
      <p class="text-text-muted text-xs">
        Powered by Cerebras and OpenRouter API.
      </p>
    </div>
	{:else}
		<!-- Optional: Show a loading message or spinner while checking for the key -->
		<p class="text-zinc-400">Checking API Key...</p>
	{/if}
</div>
