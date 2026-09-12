<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { Cross2 } from '$lib/components/icons/radix';

  let {
    id,
    labelledBy,
    title,
    icon: Icon,
    open,
    class: className = '',
    closeLabel,
    element = $bindable(),
    onclose,
    children
  }: {
    id?: string;
    labelledBy: string;
    title: string;
    icon: Component<{ size?: number | string }>;
    open: boolean;
    class?: string;
    closeLabel: string;
    element?: HTMLElement;
    onclose: () => void;
    children: Snippet;
  } = $props();
</script>

<div
  bind:this={element}
  {id}
  class={['extension-panel t-panel-slide', className]}
  data-open={open}
  role="dialog"
  aria-modal="false"
  aria-labelledby={labelledBy}
  tabindex="-1"
  onkeydown={(event) => {
    if (event.key === 'Escape') onclose();
  }}
>
  <div class="extension-panel-heading">
    <Icon size={18} /><span>{title}</span><button
      class="icon-button small"
      aria-label={closeLabel}
      onclick={onclose}><Cross2 size={14} /></button
    >
  </div>
  {@render children()}
</div>
