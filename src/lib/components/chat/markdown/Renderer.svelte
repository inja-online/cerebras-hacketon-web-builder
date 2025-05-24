<script lang="ts">
	import SVGElement from "./SVGElement.svelte";
	import { createAstContextValue, getComponentsMap, setAstContext } from "./contexts";
	import type { HastNode } from "./types";
	import { resolveComponent, svgTags as typedSvgTags } from "./utils";
	import { Copy } from "@lucide/svelte";
	import { copyText } from "svelte-copy";

	interface Props {
		astNode: any;
	}

	let { astNode }: Props = $props();
	const svgTags: readonly string[] = typedSvgTags;

	const components = getComponentsMap();

	const astContext = createAstContextValue(astNode);
	$effect(() => {
		astContext.set(astNode);
	});
	setAstContext(astContext);

	function onCopy(code: string) {
		return () => {
			copyText(code ?? "");
		};
	}

	// HACK: This looks like the worst formatting, but it prevents the library from rendering unexpected spaces.
</script>

{#if astNode.type === 'root'}{#each astNode.children as child}<svelte:self
		astNode={child}
	/>{/each}{:else if astNode.type === 'element'}
  {#if astNode.tagName === 'pre'}
    {@const preComponent = resolveComponent($components, astNode.tagName)}
    <div class="code-block-container group">
      {#if astNode.data?.meta?.code}
        <button class="copy-button" onclick={onCopy(astNode.data.meta.code)}>
          <Copy size={16} />
        </button>
      {/if}
      {#if preComponent !== null}
        {#if typeof preComponent === 'string'}
          {#if Array.isArray(astNode.children) && astNode.children.length !== 0}
            <svelte:element this={preComponent} {...astNode.properties}>
              {#each astNode.children as child}<svelte:self astNode={child} />{/each}
            </svelte:element>
          {:else}
            <svelte:element this={preComponent} {...astNode.properties} />
          {/if}
        {:else} <!-- preComponent is a Svelte Component -->
          {#if Array.isArray(astNode.children) && astNode.children.length !== 0}
            <svelte:component this={preComponent} {...astNode.properties}>
              {#each astNode.children as child}<svelte:self astNode={child} />{/each}
            </svelte:component>
          {:else}
            <svelte:component this={preComponent} {...astNode.properties} />
          {/if}
        {/if}
      {/if}
    </div>
  {:else}
    {@const component = resolveComponent($components, astNode.tagName)}
    {#if typeof component === 'string'}
      {#if svgTags.includes(component)}
        {#if Array.isArray(astNode.children) && astNode.children.length !== 0}
          <SVGElement __tag={component} {...astNode.properties}>
            {#each astNode.children as child}<svelte:self astNode={child} />{/each}
          </SVGElement>
        {:else}
          <SVGElement __tag={component} {...astNode.properties} />
        {/if}
      {:else} <!-- Regular HTML element, not 'pre', not SVG -->
        {#if Array.isArray(astNode.children) && astNode.children.length !== 0}
          <svelte:element this={component} {...astNode.properties}>
            {#each astNode.children as child}<svelte:self astNode={child} />{/each}
          </svelte:element>
        {:else}
          <svelte:element this={component} {...astNode.properties} />
        {/if}
      {/if}
    {:else if component !== null} <!-- Svelte component (not for 'pre') -->
      {#if Array.isArray(astNode.children) && astNode.children.length !== 0}
        <svelte:component this={component} {...astNode.properties}>
          {#each astNode.children as child}<svelte:self astNode={child} />{/each}
        </svelte:component>
      {:else}
        <svelte:component this={component} {...astNode.properties} />
      {/if}
    {/if}
  {/if}
{:else if astNode.type === 'text' || astNode.type === 'raw'}{astNode.value}{/if}

<style>
  .code-block-container {
    position: relative;
  }

  .copy-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background-color: rgba(63, 63, 70, 0.8);
    border: 1px solid rgb(82, 82, 91);
    color: rgb(212, 212, 216);
    transition-property: all;
    transition-duration: 200ms;
    opacity: 0;
    z-index: 10;
  }

  .copy-button:hover {
    background-color: rgba(82, 82, 91, 0.8);
    color: white;
  }

  .group:hover .copy-button {
    opacity: 1;
  }

  :global(pre) {
    position: relative;
  }
</style>
