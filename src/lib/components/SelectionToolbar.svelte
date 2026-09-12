<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  export type ToolbarAction = {
    id: string;
    label: string;
    title?: string;
    text?: string;
    icon: Component<{ size?: number | string }>;
    run: () => void;
  };

  let {
    count,
    label,
    class: className = '',
    leading,
    actions
  }: {
    count: number;
    label: string;
    class?: string;
    leading?: Snippet;
    actions: ToolbarAction[];
  } = $props();
</script>

<div class={['selection-toolbar', className]} role="region" aria-label={label}>
  {#if leading}
    {@render leading()}
  {:else}
    <span>{count} selected</span>
  {/if}
  {#each actions as action (action.id)}
    {@const Icon = action.icon}
    <button
      aria-label={action.label}
      title={action.title ?? action.label}
      onclick={action.run}
      ><Icon />{#if action.text}{action.text}{/if}</button
    >
  {/each}
</div>
