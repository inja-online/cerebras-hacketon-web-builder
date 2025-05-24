<script lang="ts">
    import type { ServerChatEvent } from '$lib/types';

    let { event } = $props<{
        event: ServerChatEvent;
    }>();
</script>

<div class="flex justify-center">
    <div class="bg-dark-secondary/50 border border-primary-accent/30 rounded-lg px-4 py-2">
        <div class="text-sm text-secondary-accent text-center">
            {event.content}
        </div>
    </div>
</div>

<style>
    /* Styles specific to ServerMessage, using variables from app.css */
    .message-group {
        width: 100%;
        padding: var(--spacing-3) 0;
    }

    .message {
        display: flex;
        justify-content: center; /* Center server messages */
        width: 100%;
    }

    .message-content {
        flex: 0 1 auto; /* Allow content to determine width, but not exceed container */
        max-width: 80%; /* Limit width */
    }

    .server-message-text {
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
        text-align: center;
        padding: var(--spacing-1) var(--spacing-3);
        background-color: var(--color-background-alt);
        border-radius: var(--radius-md);
        width: fit-content; /* Fit content width */
        margin: 0 auto; /* Center within the content area */
    }
</style>
