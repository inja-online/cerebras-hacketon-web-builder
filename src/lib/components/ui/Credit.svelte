<script lang="ts">
import { Sparkles } from '@lucide/svelte';
</script>

<div class="mx-auto mt-8 mb-2 w-fit px-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg flex items-center gap-2 shadow-sm">
  <Sparkles size={16} class="text-primary-accent opacity-80" aria-hidden="true" />
  <span class="text-xs text-zinc-400 font-medium tracking-wide select-none">
    Powered by <span class="text-primary-accent">Cerebras</span> and <span class="text-primary-accent">OpenRouter API</span>.
  </span>
</div>
