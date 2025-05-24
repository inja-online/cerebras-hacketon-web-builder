<script lang="ts">
    import type { UserChatEvent } from '$lib/types';
    import Avatar from '$lib/components/Avatar.svelte';
    import { Copy, Pencil } from '@lucide/svelte';

    let { event } = $props<{
        event: UserChatEvent;
    }>();

    function copyMessage() {
        navigator.clipboard.writeText(event.content);
    }
</script>

<div class="flex justify-end">
    <div class="max-w-[80%] bg-primary-accent/20 border border-primary-accent rounded-lg p-3">
        <div class="text-white text-sm whitespace-pre-wrap">
            {#if event.content}
                {@html event.content}
            {/if}
        </div>
        <div class="text-xs text-secondary-accent mt-1">
            {event.timestamp.toLocaleTimeString()}
        </div>
    </div>
</div>

<style>
    /* Styles specific to UserMessage, using variables from app.css */
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
        color: var(--color-foreground); /* User message color */
    }

    .prose p {
        margin: 0; /* Remove default paragraph margin */
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
</style>
