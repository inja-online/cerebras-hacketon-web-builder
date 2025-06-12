<script lang="ts">
    import type { ServerChatEvent } from '$lib/types';

    let { event } = $props<{
        event: ServerChatEvent;
    }>();
</script>

<div class="flex justify-center">
    <div class="bg-dark-secondary/50 border border-primary-accent/30 rounded-lg px-4 py-2" style="max-width: 300px;">
        <div class="text-sm text-secondary-accent text-center" style="overflow-wrap: break-word;">
            {event.content}
        </div>
    </div>
</div>
