<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { apiKeyStorageKey, settingsStorage } from "$lib/storage";
    import { Settings, SettingsIcon, BookOpen } from "@lucide/svelte";
    import MainPageInput from "$lib/components/MainPageInput.svelte";
    import RecentProjects from "$lib/components/RecentProjects.svelte";
    let apiKeyPresent = $state(false);

    onMount(async () => {
        const storedKey =
            await settingsStorage.getSetting<string>(apiKeyStorageKey);
        if (!storedKey) {
            await goto("/ask-for-api-key", { replaceState: true });
        } else {
            apiKeyPresent = true;
        }
    });
</script>

<div class="min-h-screen bg-dark-primary text-white p-8 flex flex-col">
    {#if apiKeyPresent}
        <!-- Top Section with Brand and Blog Link -->
        <div class="flex justify-between items-start mb-16">
            <a
                href="https://inja.online"
                target="_blank"
                class="text-2xl font-medium text-primary-accent tracking-wide"
                >INJA.ONLINE</a
            >
            <div class="flex items-center space-x-4">
                <a
                    href="https://blog.inja.online/how-we-built-this"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-primary-accent hover:bg-zinc-800 hover:border-primary-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-accent transition-all duration-200 shadow-sm group animate-bounce-slow"
                    title="Learn more about how we built this"
                >
                    <BookOpen size={18} class="transition-colors duration-200 group-hover:text-white" />
                    <span class="text-sm font-medium tracking-wide">Learn More</span>
                </a>
                <a href="/settings"
                    class="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-primary-accent hover:bg-zinc-800 hover:border-primary-accent hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-accent transition-all duration-200 shadow-sm group"
                    title="Settings"
                >
			        <SettingsIcon size={18} class="transition-colors duration-200 group-hover:text-white" />
			        <span class="text-sm font-medium tracking-wide hidden sm:inline">Settings</span>
		        </a>
            </div>
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

<style>
	@keyframes bounce-slow {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	.animate-bounce-slow {
		animation: bounce-slow 2.2s infinite;
	}
</style>
