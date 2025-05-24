<script lang="ts">
    import { Bot } from "@lucide/svelte";
    import Markdown from "../markdown/Markdown.svelte";
    import { gfmPlugin } from "../markdown/gfm";
    import { highlightPlugin } from "../markdown/highlight";
    import type { BotChatEvent } from "../../../types";

    interface Props {
        event: BotChatEvent;
    }

    let { event }: Props = $props();
</script>

<div class="flex gap-3">
    <div class="w-8 h-8 bg-primary-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
        <Bot class="w-4 h-4 text-primary-accent" />
    </div>
    <div class="flex-1 max-w-[80%]">
        <div class="bg-dark-secondary border border-primary-accent rounded-lg p-3">
            <div class="text-white text-sm prose prose-invert max-w-none">
                <Markdown md={event.content} plugins={[gfmPlugin(), highlightPlugin]} />
            </div>
            {#if event.config?.sources}
                <div class="mt-3 pt-3 border-t border-primary-accent/50">
                    <div class="text-xs text-secondary-accent mb-2">Sources:</div>
                    {#each event.config.sources as source}
                        <a href={source.url} class="text-xs text-primary-accent hover:underline block">
                            {source.title}
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
        <div class="text-xs text-secondary-accent mt-1 ml-3">
            {event.timestamp.toLocaleTimeString()}
        </div>
    </div>
</div>

<style>
    /* Styles specific to BotMessage, using variables from app.css */
    .message-group {
        width: 100%;
        padding: var(--spacing-3) 0;
    }

    .message {
        position: relative;
        display: flex;
        gap: var(--spacing-2);
        width: 100%;
    }

    .message-avatar {
        display: flex;
        align-items: flex-start;
        flex-shrink: 0;
    }

    .message-content {
        flex: 1;
        min-width: 0;
        position: relative;
    }

    .prose {
        line-height: var(--line-height-relaxed);
        word-break: break-word;
        font-size: var(--font-size-sm);
        color: var(--color-foreground); /* Bot message color */
    }

     .prose p {
        margin: 0;
    }

    .prose pre {
        background-color: var(--color-background-alt);
        padding: var(--spacing-2);
        border-radius: var(--radius-md);
        overflow-x: auto;
        font-size: var(--font-size-xs);
        margin: var(--spacing-2) 0;
    }

    .prose code:not(pre code) {
        background-color: var(--color-background-alt);
        padding: var(--spacing-0-5) var(--spacing-1);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
    }

    .sources {
        margin-top: var(--spacing-3);
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
    }

    .sources h4 {
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-1);
    }

    .sources ul {
        list-style: disc;
        padding-left: var(--spacing-4);
        margin: 0;
    }

    .sources li {
        margin-bottom: var(--spacing-0-5);
    }

    .sources a {
        color: var(--color-primary);
    }

    .message-actions {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        background-color: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-0-5);
        box-shadow: var(--shadow-sm);
        z-index: var(--z-10);
        opacity: 0;
        transition: opacity var(--transition-base);
        transform: translateY(-5px);
    }

    .message:hover .message-actions {
        opacity: 1;
    }

    .action-button {
        padding: var(--spacing-1);
        color: var(--color-foreground-muted);
        border-radius: var(--radius-base);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--transition-base), color var(--transition-base);
    }

    .action-button:hover {
        background-color: var(--color-background-alt);
        color: var(--color-foreground);
    }

    .action-separator {
        width: 1px;
        height: 16px;
        background-color: var(--color-border);
        margin: 0 var(--spacing-0-5);
    }
</style>
