<script lang="ts">
	import '../app.css';
	import { Settings as SettingsIcon } from '@lucide/svelte';
	import { page } from '$app/stores';
	let { children } = $props();
</script>

<div class="relative min-h-screen">
	{#if $page.url.pathname !== '/settings'}
		<a href="/settings"
			class="fixed top-6 right-6 z-50 flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-primary-accent hover:bg-zinc-800 hover:border-primary-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-accent transition-all duration-200 shadow-sm group"
			title="Settings"
		>
			<SettingsIcon size={18} class="transition-colors duration-200 group-hover:text-white" />
			<span class="text-sm font-medium tracking-wide hidden sm:inline">Settings</span>
		</a>
	{/if}
	{@render children()}
</div>
