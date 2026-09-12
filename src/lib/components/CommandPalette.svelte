<script lang="ts">
  import type { Bookmark } from '$lib/types';
  import type { MenuItem } from '$lib/menu';
  import { commandActionLabel } from '$lib/library-keyboard';
  import SiteFavicon from '$lib/components/SiteFavicon.svelte';
  import KeyboardDown from '$lib/components/icons/KeyboardDown.svelte';
  import SearchGrid from '$lib/components/icons/SearchGrid.svelte';
  import { ExternalLink } from '$lib/components/icons/radix';

  let {
    query = $bindable(''),
    searchInput = $bindable(),
    actions,
    bookmarks,
    onOpenBookmark
  }: {
    query: string;
    searchInput?: HTMLInputElement;
    actions: MenuItem[];
    bookmarks: Bookmark[];
    onOpenBookmark: (bookmark: Bookmark) => void;
  } = $props();
</script>

<div class="command-dialog">
  <h2 id="dialog-title" class="sr-only">command menu</h2>
  <div class="command-input">
    <SearchGrid size={17} /><input
      bind:this={searchInput}
      bind:value={query}
      aria-label="command menu"
      placeholder="search bookmarks or run a command…"
    /><kbd>esc</kbd>
  </div>
  <div class="command-results">
    <p>actions</p>
    {#each actions as action (action.id)}
      {@const Icon = action.icon}
      <button onclick={action.run}
        >{#if Icon}<Icon />{/if}{commandActionLabel(
          action
        )}{#if action.shortcut}<span class="single-shortcut"
            ><KeyboardDown />{action.shortcut.toUpperCase()}</span
          >{/if}</button
      >
    {/each}
    {#if bookmarks.length}
      <p>bookmarks</p>
      {#each bookmarks as bookmark (bookmark.id)}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          onclick={() => onOpenBookmark(bookmark)}
          ><span class="command-favicon"
            ><SiteFavicon url={bookmark.url} size={16} /></span
          ><strong class="command-bookmark-title">{bookmark.title}</strong
          ><small class="command-bookmark-url">{bookmark.url}</small
          ><ExternalLink class="command-external-link" size={16} /></a
        >
      {/each}
    {/if}
  </div>
</div>
