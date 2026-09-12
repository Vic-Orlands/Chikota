<script lang="ts">
  import type { Bookmark } from '$lib/types';
  import BookmarkRow from '$lib/components/BookmarkRow.svelte';
  import DateGroupOpen from '$lib/components/icons/DateGroupOpen.svelte';
  import { ChevronDown } from '$lib/components/icons/radix';

  let {
    date,
    items,
    collapsed,
    onToggle,
    onStartDrag
  }: {
    date: string;
    items: Bookmark[];
    collapsed: boolean;
    onToggle: () => void;
    onStartDrag: (event: PointerEvent) => void;
  } = $props();

  const summaryCount = $derived(Math.min(items.length, 5));
</script>

<div class="date-group" class:collapsed>
  <button class="date-heading" aria-expanded={!collapsed} onclick={onToggle}
    ><span>{date}</span><span class="count">{items.length}</span><span
      class="t-icon-swap date-icon-swap"
      data-state={collapsed ? 'closed' : 'opened'}
      aria-hidden="true"
    >
      <span class="t-icon" data-icon="closed"
        ><span class="date-icon-glyph"><ChevronDown size={15} /></span></span
      >
      <span class="t-icon" data-icon="opened"
        ><span class="date-icon-glyph"><DateGroupOpen size={15} /></span></span
      >
    </span></button
  >
  <div
    class="collapse-grid date-summary-collapse"
    class:open={collapsed}
    inert={collapsed ? undefined : true}
    aria-hidden={!collapsed}
  >
    <div class="collapse-inner">
      <button
        type="button"
        class="date-summary-toggle"
        aria-label={`expand ${items.length} bookmarks from ${date}`}
        onclick={onToggle}
      >
        {#each { length: summaryCount }, i}
          <span class="date-summary-line" data-depth={i}></span>
        {/each}
        <span class="date-summary-count"
          >{items.length}
          {items.length === 1 ? 'link' : 'links'}</span
        >
      </button>
    </div>
  </div>
  <div
    class="collapse-grid date-bookmarks-collapse"
    class:open={!collapsed}
    inert={collapsed ? true : undefined}
    aria-hidden={collapsed}
  >
    <div class="collapse-inner">
      <div
        class="bookmark-items"
        role="listbox"
        tabindex="-1"
        aria-multiselectable="true"
        aria-label={`bookmarks saved ${date}; drag across rows to select`}
        onpointerdown={onStartDrag}
      >
        {#each items as bookmark (bookmark.id)}
          <BookmarkRow {bookmark} />
        {/each}
      </div>
    </div>
  </div>
</div>
