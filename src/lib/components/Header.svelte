<script>
	import { Globe, Settings } from "@lucide/svelte";
	
	let { project } = $props();
</script>

<div class="flex justify-between items-center p-4 border-b border-zinc-800">
	<div class="flex items-center space-x-4">
		<header class="flex items-center justify-between border-b border-primary-accent">
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-medium text-white flex items-center">
					<a href="https://inja.online" target="_blank" class="base-text mr-2">INJA.ONLINE</a><span class="builder-container"><span class="builder-text"> / Builder</span></span>
				</h1>
			</div>
		</header>
	</div>
	<div class="flex items-center space-x-4">
		<a
			href="/"
			class="text-zinc-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-2"
		>
			New Chat
		</a>
		<a
			href="/settings"
			class="text-zinc-400 hover:text-white transition-colors duration-200 text-sm flex items-center gap-2"
		>
			<Settings size={16} />
			Settings
		</a>
	</div>
</div>

<style>
	.base-text {
		position: relative;
		z-index: 2;
	}

	.builder-container {
		overflow: hidden;
		display: inline-block;
		position: relative;
		width: 0;
		animation: revealContainer 0.8s ease-out 1.2s forwards;
	}

	.builder-text {
		display: inline-block;
		white-space: nowrap;
		transform: translateX(-100%);
		position: relative;
		animation: slideFromLeft 1.2s cubic-bezier(0.23, 1, 0.32, 1) 1.2s forwards;
	}

	@keyframes revealContainer {
		from { width: 0; }
		to { width: 5em; }
	}

	@keyframes slideFromLeft {
		0% {
			transform: translateX(-100%);
			opacity: 0.7;
		}
		70% {
			transform: translateX(2%);
			opacity: 1;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
			text-shadow: 0 0 25px rgba(255, 255, 255, 0.06);
		}
	}

	.builder-text::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, 
			transparent 0%, 
			rgba(255, 255, 255, 0.02) 50%, 
			transparent 100%);
		opacity: 0;
		animation: luxGlow 3s ease-in-out infinite 3s;
	}

	@keyframes luxGlow {
		0%, 100% { opacity: 0; }
		50% { opacity: 1; }
	}
</style>
