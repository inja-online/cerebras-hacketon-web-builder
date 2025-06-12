<script lang="ts">
    import { Bot, Download, History, Copy, RefreshCw } from "@lucide/svelte";
    import Markdown from "../markdown/Markdown.svelte";
    import { gfmPlugin } from "../markdown/gfm";
    import { highlightPlugin } from "../markdown/highlight";
    import type { BotChatEvent } from "../../../types";

    interface Props {
        event: BotChatEvent;
        onDownloadHtml?: (htmlContent: string, messageId: string) => void;
        onRevertToHtml?: (htmlContent: string) => void;
        onRetryMessage?: (botMessageId: string) => void;
    }

    let { 
        event, 
        onDownloadHtml = (content: string, id: string) => {}, 
        onRevertToHtml = (content: string) => {},
        onRetryMessage = (id: string) => {}
    }: Props = $props();

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
    
    function copyMessageContent() {
        // Prefers rawContent if available (usually more complete), falls back to displayed content
        const contentToCopy = event.rawContent || event.content;
        navigator.clipboard.writeText(contentToCopy);
    }

    function handleRetry() {
        if (onRetryMessage) {
            onRetryMessage(event.id);
        }
    }

    const hasHtmlContent = $derived(typeof event.htmlContent === 'string' && event.htmlContent.trim() !== '');
</script>

<div class="message group flex gap-3">
    <div
        class="w-8 h-8 bg-primary-accent/20 rounded-full flex items-center justify-center flex-shrink-0"
    >
        <Bot class="w-4 h-4 text-primary-accent" />
    </div>
    <div class="flex-1 relative" style="max-width: 300px;"> <!-- Added relative for actions positioning -->
        <div class="message-actions">
            <button title="Retry generation" class="action-button" onclick={handleRetry}>
                <RefreshCw size={16} />
            </button>
            {#if hasHtmlContent}
                <button title="Download HTML" class="action-button" onclick={handleDownload}>
                    <Download size={16} />
                </button>
                <button title="Revert to this version" class="action-button" onclick={handleRevert}>
                    <History size={16} />
                </button>
            {/if}
            <div class="action-separator"></div>
            <button title="Copy message" class="action-button" onclick={copyMessageContent}>
                <Copy size={16} />
            </button>
        </div>
        <div
            class="bg-dark-secondary border border-primary-accent rounded-lg p-3"
        >
            <div
                class="text-white text-sm prose prose-invert max-w-none"
                style="overflow-wrap: break-word;"
            >
                <Markdown
                    md={event.content}
                    plugins={[gfmPlugin(), highlightPlugin]}
                />
            </div>
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
        position: relative; /* Ensure this is set for absolute positioning of actions */
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

    .message-actions {
        position: absolute;
        top: -0.5rem; /* Adjust to be above the message bubble */
        right: 0.5rem; /* Align with the right side of the message bubble (or left for bot messages if preferred) */
        /* For bot messages, actions are typically on the right of the bubble still, or top-right of the content area */
        /* Let's try right of the content area */
        /* If message-content is the reference, then right: 0; top: -0.5rem; might be better */
        /* Given current structure, this should be relative to the `flex-1` div */
        display: flex;
        align-items: center;
        background-color: var(--color-background-alt, #2d2d2d);
        border: 1px solid var(--color-border, #4a4a4a);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-0-5, 2px);
        box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05));
        z-index: var(--z-10, 10);
        opacity: 0;
        transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
        transform: translateY(5px) scale(0.95);
        pointer-events: none;
    }

    .message.group:hover .message-actions { /* Use .group:hover for parent hover */
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
    }

    .action-button {
        padding: var(--spacing-1);
        color: var(--color-foreground-muted);
        border-radius: var(--radius-base);
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background-color var(--transition-base),
            color var(--transition-base);
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
