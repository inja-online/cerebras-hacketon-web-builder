<script lang="ts">
    import type { ChatEvent } from '../../types';
    import ChatMessage from './ChatMessage.svelte';

    let { events = [] } = $props<{
        events: ChatEvent[];
    }>();
</script>

<div class="flex-1 bg-dark-primary m-6 mb-4 border border-primary-accent rounded-md p-4 overflow-y-auto">
    <div class="space-y-4">
        {#each events as event (event.id)}
            {#if event.type === 'thinking'}
                thinking...
            {:else}
                <ChatMessage {event} />
            {/if}
        {/each}
    </div>
</div>

<style>
    .chat-view {
        width: 100%;
    }
</style>
