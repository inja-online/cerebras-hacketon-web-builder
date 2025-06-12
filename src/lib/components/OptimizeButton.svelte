<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import { optimizePrompt } from "$lib/apis/openrouter";

    interface Props {
        disabled?: boolean;
        size?: number;
        onOptimized?: (optimizedText: string) => void;
        text: string;
        contextText?: string; // Added contextText prop
    }

    let { disabled = false, size = 20, onOptimized, text, contextText }: Props = $props();
    
    let isOptimizing = $state(false);
    let hasOptimized = $state(false);
    let optimizationError = $state<string | null>(null); // Added for error message

    async function handleOptimize() {
        if (!text.trim() || isOptimizing || disabled) return;
        
        const originalText = text.trim();
        const currentContextText = contextText?.trim();
        isOptimizing = true;
        hasOptimized = false;
        optimizationError = null; // Clear previous errors
        
        try {
            const optimizedText = await optimizePrompt(originalText, currentContextText);
            
            // Add a small delay to ensure user sees the completion of the animation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Call the callback with optimized text
            if (onOptimized) {
                onOptimized(optimizedText);
            }
            
            hasOptimized = true;
            
            // Reset the optimization highlight after a moment
            setTimeout(() => {
                hasOptimized = false;
            }, 100);
            
        } catch (error) {
            console.error("Failed to optimize prompt:", error);
            optimizationError = "Failed to optimize. Please try again."; // Set error message
            setTimeout(() => { // Clear error after a few seconds
                optimizationError = null;
            }, 3000);
        } finally {
            isOptimizing = false;
        }
    }
</script>

<div class="flex flex-col items-center">
    <button
        onclick={handleOptimize}
        disabled={!text.trim() || isOptimizing || disabled}
        class="p-2 text-zinc-400 hover:text-primary-accent disabled:text-zinc-600 disabled:cursor-not-allowed transition-all duration-200 group"
        title={isOptimizing ? "Optimizing your prompt..." : (optimizationError || "Optimize prompt with AI")}
    >
        <div class="relative">
            <Sparkles 
                {size}
                class={`transition-all duration-300 ${isOptimizing ? 'scale-110 text-primary-accent animate-pulse' : (optimizationError ? 'text-red-500' : 'group-hover:scale-105')}`}
            />
            {#if isOptimizing}
                <!-- Rotating sparkle effect -->
                <div class="absolute inset-0 animate-spin">
                    <Sparkles 
                        {size}
                        class="text-primary-accent/40"
                    />
                </div>
                <!-- Pulsing dots around the icon -->
                <div class="absolute -inset-2 rounded-full border-2 border-primary-accent/30 animate-ping"></div>
            {/if}
        </div>
    </button>
    {#if optimizationError}
        <p class="text-xs text-red-500 mt-1">{optimizationError}</p>
    {/if}
</div>
