<script lang="ts">
  import {
    createComponentsContextValue,
    setComponentsContext
  } from "./contexts";
  import Renderer from "./Renderer.svelte";
  import type { HastNode, Parser, Plugin } from "./types";
  import { createParser, nonNullable } from "./utils";

  interface Props {
    md: string;
    plugins?: Plugin[];
  }

  let { md, plugins = [] }: Props = $props();
  
  let parse = $derived(createParser(plugins));

  const componentsContextValue = createComponentsContextValue({});
  $effect(() => {
    componentsContextValue.set({
      ...plugins
        .map((plugin) => plugin.renderer)
        .filter(nonNullable)
        .reduce((acc, cur) => ({ ...acc, ...cur }), {})
    });
  });
  setComponentsContext(componentsContextValue);

  let result = $derived(parse(md) as HastNode);
</script>

<Renderer astNode={result} />
