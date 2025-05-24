<script>
	import { Send, MessageCircle, Globe, GripVertical } from "@lucide/svelte";
	import { onMount } from "svelte";

	let leftPanelWidth = $state(70);
	let isResizing = $state(false);
	let containerRef;

	function startResize(e) {
		isResizing = true;
		document.addEventListener("mousemove", handleResize);
		document.addEventListener("mouseup", stopResize);
		e.preventDefault();
	}

	function handleResize(e) {
		if (!isResizing || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const newWidth =
			((e.clientX - containerRect.left) / containerRect.width) * 100;

		// Constrain between 30% and 85%
		leftPanelWidth = Math.min(Math.max(newWidth, 30), 85);
	}

	function stopResize() {
		isResizing = false;
		document.removeEventListener("mousemove", handleResize);
		document.removeEventListener("mouseup", stopResize);
	}

	onMount(() => {
		return () => {
			document.removeEventListener("mousemove", handleResize);
			document.removeEventListener("mouseup", stopResize);
		};
	});
</script>

<svelte:head>
	<title>inja.online</title>
</svelte:head>

<div class="h-screen bg-dark-primary flex flex-col">
	<!-- Header -->
	<header
		class="flex items-center justify-between p-6 border-b border-primary-accent"
	>
		<div class="flex items-center gap-2">
			<Globe class="w-6 h-6 text-primary-accent" />
			<h1 class="text-2xl font-medium text-white">inja.online</h1>
		</div>
	</header>

	<!-- Main Content Layout -->
	<div class="flex flex-1 overflow-hidden" bind:this={containerRef}>
		<!-- Main Content Pane (Left) -->
		<div
			class="bg-dark-secondary border-r border-primary-accent flex flex-col "
			style="width: {leftPanelWidth}%"
		>
			<div class="p-6 border-b border-primary-accent">
				<span class="text-white font-medium">iframe</span>
			</div>

			<!-- Iframe Container -->
			<div
				class="flex-1 bg-dark-primary m-6 border border-primary-accent rounded-md p-4 flex items-center justify-center"
			>
				<span class="text-muted">Content will load here</span>
			</div>

			<!-- Attribution -->
			<div class="p-6 border-t border-primary-accent">
				<span class="text-sm text-muted"
					>powered by cerebras & svelte</span
				>
			</div>
		</div>

		<!-- Resize Handle -->
		<div
			class="w-1 bg-primary-accent hover:bg-secondary-accent cursor-col-resize flex items-center justify-center group "
			class:bg-secondary-accent={isResizing}
			on:mousedown={startResize}
			role="separator"
			tabindex="0"
		>
			<GripVertical
				class="w-3 h-6 text-dark-primary group-hover:text-dark-secondary transition-colors"
			/>
		</div>

		<!-- Chat Sidebar (Right) -->
		<div
			class="flex-1 bg-dark-secondary flex flex-col"
			style="min-width: 320px"
		>
			<!-- Chat Header -->
			<div
				class="p-6 border-b border-primary-accent flex items-center justify-between"
			>
				<div class="flex items-center gap-2">
					<MessageCircle class="w-5 h-5 text-primary-accent" />
					<span class="text-white font-medium">chat</span>
				</div>
				<span class="text-sm text-secondary-accent">contact us :)</span>
			</div>

			<!-- Chat Content Area -->
			<div
				class="flex-1 bg-dark-primary m-6 mb-4 border border-primary-accent rounded-md p-4 overflow-y-auto"
			>
				<div class="space-y-3">
					<div class="text-sm text-secondary-accent">
						Welcome to inja.online! How can we help you today?
					</div>
				</div>
			</div>

			<!-- Chat Input -->
			<div class="p-6 pt-0 space-y-3">
				<textarea
					class="w-full h-20 bg-dark-primary border border-primary-accent rounded-md p-3 text-white placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary-accent/50 transition-all"
					placeholder="Type your message..."
				></textarea>

				<button class="button w-full">
					<span class="text_button">Send Message</span>
					<Send class="sparkle w-4 h-4" />
					<div class="dots_border"></div>
				</button>
			</div>
		</div>
	</div>
</div>
