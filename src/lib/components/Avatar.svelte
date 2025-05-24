<script lang="ts">
    let { url = null, fallback = "U" } = $props<{
        url: string | null;
        fallback?: string;
    }>();
    
    const defaultAvatarUrl = "https://ui-avatars.com/api/?background=random";
    
    function getInitials(fallback: string): string {
        return fallback.charAt(0).toUpperCase();
    }
</script>

<div class="avatar">
    {#if url}
        <img src={url} alt="Avatar" />
    {:else}
        <div class="avatar-fallback">
            {getInitials(fallback)}
        </div>
    {/if}
</div>

<style>
    .avatar {
        position: relative;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-md);
        flex-shrink: 0;
        overflow: hidden;
    }
    
    .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .avatar-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-secondary);
        color: var(--color-background);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
    }
    
    .avatar::after {
        content: '';
        position: absolute;
        inset: 0;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: var(--radius-md);
        pointer-events: none;
    }
</style>
