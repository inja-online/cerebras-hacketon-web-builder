<script lang="ts">
import { Sparkles } from "@lucide/svelte";

const phrases = ["landing page", "online shop", "blog", "portfolio", "web app", "dashboard", "API integration", "SvelteKit app", "static site", "dynamic website"];
let currentPhrase = '';
let phraseIndex = 0;
let charIndex = 0;
let typing = true;

function typeEffect() {
  if (typing) {
    if (charIndex < phrases[phraseIndex].length) {
      currentPhrase = phrases[phraseIndex].slice(0, charIndex + 1);
      charIndex++;
      setTimeout(typeEffect, 60);
    } else {
      typing = false;
      setTimeout(() => {
        setTimeout(eraseEffect, 1000);
      }, 1000);
    }
  }
}

function eraseEffect() {
  if (!typing) {
    if (charIndex > 0) {
      currentPhrase = phrases[phraseIndex].slice(0, charIndex - 1);
      charIndex--;
      setTimeout(eraseEffect, 30);
    } else {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typing = true;
      setTimeout(typeEffect, 300);
    }
  }
}

import { onMount } from 'svelte';
onMount(() => {
  typeEffect();
});
</script>

<a
  href="https://inja.online"
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex flex-col items-start gap-0 px-3 py-1 rounded-lg bg-zinc-950/80  focus:outline-none focus:ring-2 focus:ring-primary-accent transition-all duration-200 text-2xl font-semibold text-white tracking-wide shadow-sm"
  aria-label="INJA.ONLINE homepage"

>
  <span class="inline-flex items-center gap-2">
    <Sparkles size={22} class="text-primary-accent drop-shadow-sm" aria-hidden="true" />
    <span class="font-inter font-semibold tracking-tight text-white select-none">
      INJA<span class="text-primary-accent">.ONLINE</span>
    </span>
  </span>
  <span class="mt-0.5 text-sm text-zinc-400 font-normal tracking-normal h-5 min-h-[1.25rem] select-none" aria-live="polite">
    build <span class="text-primary-accent">{currentPhrase}</span><span class="opacity-70 animate-pulse">|</span>
  </span>
</a>
