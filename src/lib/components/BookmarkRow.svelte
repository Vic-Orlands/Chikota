<script lang="ts">
  import type { Bookmark } from '$lib/types';
  import { getLibraryContext } from '$lib/library-context.svelte';
  import SiteFavicon from '$lib/components/SiteFavicon.svelte';
  import CopyIconSwap from '$lib/components/CopyIconSwap.svelte';
  import ActionBell from '$lib/components/icons/ActionBell.svelte';
  import EllipsisVertical from '$lib/components/icons/EllipsisVertical.svelte';
  import ReminderDone from '$lib/components/icons/ReminderDone.svelte';
  import { ArrowUpRight, Pin } from '$lib/components/icons/radix';

  let { bookmark }: { bookmark: Bookmark } = $props();

  const library = getLibraryContext();
  const copied = $derived(
    library.copiedTargets.includes(`bookmark:${bookmark.id}`)
  );
  const selected = $derived(library.selected.includes(bookmark.id));
  const reminderStatus = $derived(library.reminderStatusById.get(bookmark.id));
  const reminderActive = $derived(
    reminderStatus === 'active' && Boolean(bookmark.reminderAt)
  );
</script>

<div
  data-bookmark={bookmark.id}
  class="bookmark-row"
  role="option"
  tabindex="0"
  aria-selected={selected}
  class:selected
  class:is-read={library.flags[bookmark.id]?.read}
  class:context-active={library.contextBookmarkId === bookmark.id}
  onclick={(event) => {
    if (library.dragging) {
      event.preventDefault();
      library.clearDragging();
      return;
    }
    if ((event.target as HTMLElement).closest('a,button,input')) return;
    event.preventDefault();
    if (!library.selectBookmarkRange(event, bookmark.id, library.visibleIds))
      library.selectBookmark(bookmark.id);
  }}
  onkeydown={(event) => {
    if (
      event.target !== event.currentTarget ||
      !['Enter', ' '].includes(event.key)
    )
      return;
    event.preventDefault();
    library.selectBookmark(bookmark.id);
  }}
  oncontextmenu={(event) => {
    event.stopPropagation();
    void library.showContext(event, bookmark);
  }}
  aria-label={bookmark.title}
>
  <div class="bookmark-leading">
    <span class="site-letter" class:show-check={library.selectMode || selected}
      ><SiteFavicon url={bookmark.url} size={18} /></span
    ><input
      class="row-check"
      class:check-visible={library.selectMode || selected}
      type="checkbox"
      checked={selected}
      onclick={(event) => {
        if (
          !library.selectBookmarkRange(event, bookmark.id, library.visibleIds)
        )
          event.stopPropagation();
      }}
      onchange={() => library.toggleSelect(bookmark.id)}
      aria-label={`select ${bookmark.title}`}
    />
  </div>
  <div class="bookmark-content">
    <a
      class="bookmark-title"
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      onclick={(event) => {
        event.stopPropagation();
        library.recordOpen(bookmark.id);
      }}>{bookmark.title}<ArrowUpRight size={14} /></a
    >
    <div class="bookmark-meta">
      <span>{bookmark.url}</span>
    </div>
  </div>
  <div class="row-actions">
    <button
      class="icon-button"
      class:reminder-active={reminderActive}
      aria-label={`remind me about ${bookmark.title}`}
      title={bookmark.reminderAt
        ? library.formatReminder(bookmark.reminderAt)
        : 'set reminder'}
      onclick={(event) => void library.showReminderPopover(event, bookmark)}
      ><ActionBell size={14} /></button
    >
    <button
      class="icon-button"
      class:pinned={library.flags[bookmark.id]?.pinned}
      aria-label={library.flags[bookmark.id]?.pinned
        ? `unpin ${bookmark.title}`
        : `pin ${bookmark.title}`}
      title={library.flags[bookmark.id]?.pinned ? 'unpin' : 'pin'}
      onclick={(event) => {
        event.stopPropagation();
        library.toggleFlag(bookmark.id, 'pinned');
      }}><Pin size={14} /></button
    ><button
      class="icon-button"
      aria-label={copied
        ? `link copied for ${bookmark.title}`
        : `copy link for ${bookmark.title}`}
      title="copy link"
      onclick={(event) => {
        event.stopPropagation();
        void library.copyLink(bookmark);
      }}><CopyIconSwap {copied} size={14} /></button
    >
    <button
      class="icon-button"
      title="more options"
      aria-label={`more options for ${bookmark.title}`}
      onclick={(event) => library.showContext(event, bookmark)}
      ><EllipsisVertical size={16} /></button
    >
  </div>
  {#if bookmark.reminderAt && reminderStatus === 'done'}<span
      class="reminder-done-marker"
      title="reminder completed"
      aria-label="reminder completed"><ReminderDone size={16} /></span
    >{/if}
</div>
