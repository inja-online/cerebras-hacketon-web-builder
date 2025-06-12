<script lang="ts">
    import UserMessage from "./messages/UserMessage.svelte";
    import BotMessage from "./messages/BotMessage.svelte";
    import ServerMessage from "./messages/ServerMessage.svelte";
    import ThinkingMessage from "./messages/ThinkingMessage.svelte";
    import type { ChatEvent } from "$lib/types";

    interface Props {
        event: ChatEvent;
        onDownloadHtmlFromMessage?: (htmlContent: string, messageId: string) => void;
        onRevertToHtmlFromMessage?: (htmlContent: string) => void;
        onRetryFromMessage?: (botMessageId: string) => void;
    }

    let { event, onDownloadHtmlFromMessage, onRevertToHtmlFromMessage, onRetryFromMessage }: Props = $props();
</script>

{#if event.type === "user"}
    <UserMessage {event} onDownloadHtml={onDownloadHtmlFromMessage} onRevertToHtml={onRevertToHtmlFromMessage} />
{:else if event.type === "bot"}
    <BotMessage {event} onDownloadHtml={onDownloadHtmlFromMessage} onRevertToHtml={onRevertToHtmlFromMessage} onRetryMessage={onRetryFromMessage} />
{:else if event.type === "server"}
    <ServerMessage {event} />
{:else if event.type === "thinking"}
    <ThinkingMessage {event} />
{/if}

<style>
    :global(.message-group) {
        width: 100%;
        padding: var(--spacing-3) 0;
    }
    
    :global(.message) {
        position: relative;
        display: flex;
        gap: var(--spacing-2);
        width: 100%;
    }
    
    :global(.message-avatar) {
        display: flex;
        align-items: flex-start;
        flex-shrink: 0;
    }
    
    :global(.message-content) {
        flex: 1;
        min-width: 0;
        position: relative;
    }
    
    :global(.prose) {
        line-height: var(--line-height-relaxed);
        word-break: break-word;
        font-size: var(--font-size-sm);
    }
    
    :global(.user .prose) {
        color: var(--color-foreground);
    }
    
    :global(.bot .prose) {
        color: var(--color-foreground);
    }
    
    :global(.server-message) {
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
        text-align: center;
        padding: var(--spacing-1) var(--spacing-3);
        background-color: var(--color-background-alt);
        border-radius: var(--radius-md);
        margin: 0 auto;
        max-width: 80%;
        width: fit-content;
    }
    
    :global(.message-actions) {
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
    
    :global(.message:hover .message-actions) {
        opacity: 1;
    }
    
    :global(.action-button) {
        padding: var(--spacing-1);
        color: var(--color-foreground-muted);
        border-radius: var(--radius-base);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--transition-base), color var(--transition-base);
    }
    
    :global(.action-button:hover) {
        background-color: var(--color-background-alt);
        color: var(--color-foreground);
    }
    
    :global(.action-separator) {
        width: 1px;
        height: 16px;
        background-color: var(--color-border);
        margin: 0 var(--spacing-0-5);
    }
    
    /* Message type-specific styles */
    :global(.thinking) {
        color: var(--color-foreground-muted);
        font-style: italic;
    }
</style>
