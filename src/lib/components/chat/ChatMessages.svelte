<script lang="ts">
    import type { ChatEvent } from '../../types';
    import ChatMessage from './ChatMessage.svelte';

    let { events = [] ,
		onDownloadHtmlFromMessage,
		onRevertToHtmlFromMessage,
        onRetryFromMessage,
    } = $props<{
        events: ChatEvent[];
        onDownloadHtmlFromMessage?: (htmlContent: string, messageId: string) => void;
        onRevertToHtmlFromMessage?: (htmlContent: string) => void;
        onRetryFromMessage?: (botMessageId: string) => void;
    }>();
</script>

<div class="flex-1 bg-dark-primary  p-4 overflow-y-auto">
    <div class="space-y-4">
        {#each events as event (event.id)}
            {#if event.type === 'thinking'}
                thinking...
            {:else}
                <ChatMessage {event} 
                    onDownloadHtmlFromMessage={onDownloadHtmlFromMessage} 
                    onRevertToHtmlFromMessage={onRevertToHtmlFromMessage}
                    onRetryFromMessage={onRetryFromMessage}
                />
            {/if}
        {/each}
    </div>
</div>
