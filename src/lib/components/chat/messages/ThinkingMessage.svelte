<script lang="ts">
    import Avatar from '$lib/components/Avatar.svelte';
    import { Bot } from "@lucide/svelte";
    import type { ThinkingChatEvent } from "$lib/types";

    interface Props {
        event: ThinkingChatEvent;
    }

    let { event }: Props = $props();
</script>

<div class="message-group thinking">
    <div class="message">
        <div class="message-avatar">
            <Avatar url={null} fallback="AI" />
        </div>
        <div class="message-content">
            <div class="thinking-indicator">
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
            </div>
            <span class="text-sm text-secondary-accent">Thinking...</span>
        </div>
    </div>
</div>

<style>
    .message-group {
        width: 100%;
        padding: var(--spacing-3) 0;
    }

    .message {
        display: flex;
        gap: var(--spacing-2);
        width: 100%;
        align-items: center; /* Align items vertically */
    }

    .message-avatar {
        display: flex;
        align-items: flex-start; /* Keep avatar aligned to top */
        flex-shrink: 0;
    }

    .message-content {
        flex: 1;
        min-width: 0;
    }

    .thinking-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        height: 20px; /* Match avatar height for alignment */
    }

    .thinking-dot {
        width: 6px;
        height: 6px;
        border-radius: var(--radius-full);
        background-color: var(--color-foreground-muted);
        animation: pulse 1.5s infinite;
    }

    .thinking-dot:nth-child(2) {
        animation-delay: 0.2s;
    }

    .thinking-dot:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
        }
        50% {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes thinking {
        0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(1);
        }
        40% {
            opacity: 1;
            transform: scale(1.2);
        }
    }
</style>
