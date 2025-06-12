<script lang="ts">
    import type { UserChatEvent } from '$lib/types';
    import Avatar from '$lib/components/Avatar.svelte';
    import { Copy, Pencil, Download, History } from '@lucide/svelte';

    let { event, onDownloadHtml = (content: string, id: string) => {}, onRevertToHtml = (content: string) => {} } = $props<{
        event: UserChatEvent;
        onDownloadHtml?: (htmlContent: string, messageId: string) => void;
        onRevertToHtml?: (htmlContent: string) => void;
    }>();

    function copyMessage() {
        navigator.clipboard.writeText(event.content);
    }

    function handleDownload() {
        if (event.htmlContent && onDownloadHtml) {
            onDownloadHtml(event.htmlContent, event.id);
        }
    }

    function handleRevert() {
        if (event.htmlContent && onRevertToHtml) {
            onRevertToHtml(event.htmlContent);
        }
    }

    // Assuming UserChatEvent might have htmlContent for this feature
    const hasHtmlContent = $derived(typeof event.htmlContent === 'string' && event.htmlContent.trim() !== '');

</script>

<div class="message group flex justify-end">
    <div class="message-actions">
        {#if hasHtmlContent}
            <button title="Download HTML" class="action-button" onclick={handleDownload}>
                <Download size={16} />
            </button>
            <button title="Revert to this version" class="action-button" onclick={handleRevert}>
                <History size={16} />
            </button>
            <div class="action-separator"></div>
        {/if}
        <button title="Copy text" class="action-button" onclick={copyMessage}>
            <Copy size={16} />
        </button>
        <!-- <button title="Edit (not implemented)" class="action-button">
            <Pencil size={16} />
        </button> -->
    </div>
    <div class="bg-primary-accent/20 border border-primary-accent rounded-lg p-3" style="max-width: 300px;">
        <div class="text-white text-sm whitespace-pre-wrap" style="overflow-wrap: break-word;">
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
        /* display: flex; */ /* Already flex by parent div */
        gap: var(--spacing-2);
        width: 100%;
        justify-content: flex-end; /* Align user messages to the right */
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
        top: -0.5rem; /* Adjust to be above the message bubble */
        right: 0.5rem; /* Align with the right side of the message bubble */
        display: flex;
        align-items: center;
        background-color: var(--color-background-alt, #2d2d2d); /* Fallback color */
        border: 1px solid var(--color-border, #4a4a4a); /* Fallback color */
        border-radius: var(--radius-md, 6px); /* Fallback value */
        padding: var(--spacing-0-5, 2px); /* Fallback value */
        box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05)); /* Fallback value */
        z-index: var(--z-10, 10); /* Fallback value */
        opacity: 0;
        transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        transform: translateY(5px) scale(0.95);
        pointer-events: none; /* Initially not interactive */
    }

    .message.group:hover .message-actions { /* Use .group:hover for parent hover */
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto; /* Interactive on hover */
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
