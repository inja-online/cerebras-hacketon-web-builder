<svelte:options namespace="svg" />

<script lang="ts">
  export let __tag: string;
</script>

<svelte:element {...$$restProps} this={__tag}>
  <slot />
</svelte:element>
