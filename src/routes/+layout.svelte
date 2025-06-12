<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="relative min-h-screen">
	{@render children()}
</div>
