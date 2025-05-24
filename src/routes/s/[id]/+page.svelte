<script>
	import { GripVertical } from "@lucide/svelte";
	import { onMount } from "svelte";
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import ChatLayout from "$lib/components/chat/ChatLayout.svelte";

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
	<Header />

	<!-- Main Content Layout -->
	<div class="flex flex-1 overflow-hidden" bind:this={containerRef}>
		<!-- Main Content Pane (Left) -->
		<div
			class="bg-dark-secondary border-r border-primary-accent flex flex-col"
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
			<Footer />
		</div>

		<!-- Resize Handle -->
		<div
			class="w-1 bg-primary-accent hover:bg-secondary-accent cursor-col-resize flex items-center justify-center group"
			class:bg-secondary-accent={isResizing}
			onmousedown={startResize}
			role="separator"
			tabindex="0"
		>
			<GripVertical
				class="w-3 h-6 text-dark-primary group-hover:text-dark-secondary transition-colors"
			/>
		</div>

		<!-- Chat Sidebar (Right) -->
		<ChatLayout />
	</div>
</div>
