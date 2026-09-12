<script lang="ts">
  import KeyboardDown from '$lib/components/icons/KeyboardDown.svelte';
  import {
    isMenuSeparator,
    menuLabel,
    visibleMenuEntries,
    type MenuEntry
  } from '$lib/menu';

  let {
    entries,
    x,
    y,
    panel = $bindable(),
    onclose,
    onkeydown
  }: {
    entries: MenuEntry[];
    x: number;
    y: number;
    panel?: HTMLDivElement;
    onclose: () => void;
    onkeydown: (event: KeyboardEvent) => void;
  } = $props();

  const visible = $derived(visibleMenuEntries(entries));
</script>

<button
  class="context-backdrop"
  aria-label="close context menu"
  onclick={onclose}
  oncontextmenu={(event) => {
    event.preventDefault();
    onclose();
  }}
  tabindex="-1"
></button>
<div
  bind:this={panel}
  class="context-menu"
  role="menu"
  tabindex="-1"
  {onkeydown}
  style:left={`${x}px`}
  style:top={`${y}px`}
>
  {#each visible as entry (entry.id)}
    {#if isMenuSeparator(entry)}
      <hr />
    {:else}
      {@const Icon = entry.icon}
      <button
        role="menuitem"
        class:danger-text={entry.danger}
        data-shortcut={entry.shortcut}
        onclick={entry.run}
      >
        {#if Icon}<Icon />{/if}<span>{menuLabel(entry)}</span
        >{#if entry.shortcut}<kbd
            ><KeyboardDown />{entry.shortcut.toUpperCase()}</kbd
          >{/if}
      </button>
    {/if}
  {/each}
</div>
