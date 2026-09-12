<script lang="ts">
  import type { Category } from '$lib/types';
  import EmptyMono from '$lib/components/EmptyMono.svelte';
  import {
    ChevronDown,
    FileTray,
    FileTrayStacked,
    MoreVertical,
    Plus
  } from '$lib/components/icons/radix';

  let {
    collections,
    counts,
    section,
    selectedIds,
    open = true,
    onToggle,
    onCreate,
    onSelect,
    onEdit
  }: {
    collections: Category[];
    counts: Map<string, number>;
    section: string;
    selectedIds: string[];
    open?: boolean;
    onToggle: () => void;
    onCreate: () => void;
    onSelect: (event: MouseEvent, id: string) => void;
    onEdit: (id: string) => void;
  } = $props();
</script>

<section
  data-tour="collections"
  class="collection-section ruled-section"
  aria-labelledby="collections-heading"
>
  <div class="section-toolbar py-2!">
    <button
      class="section-toggle"
      aria-expanded={open}
      aria-controls="collection-content"
      onclick={onToggle}
      >{#if collections.length}<FileTrayStacked size={14} />{:else}<FileTray
          size={14}
        />{/if}
      <h2 id="collections-heading">collections</h2>
      <span class="count">{collections.length}</span><ChevronDown
        size={14}
        class={open ? 'chevron expanded' : 'chevron'}
      /></button
    >
    <button class="plain-button" onclick={onCreate}><Plus size={15} /></button>
  </div>
  <div
    id="collection-content"
    class="collapse-grid"
    class:open
    inert={!open ? true : undefined}
    aria-hidden={!open}
  >
    <div class="collapse-inner">
      {#if collections.length}
        <div class="collection-grid">
          {#each collections as collection (collection.id)}
            <div
              class="collection-card"
              class:active={section === collection.id}
              class:selected={selectedIds.includes(collection.id)}
            >
              <button
                class="collection-main"
                aria-pressed={selectedIds.includes(collection.id)}
                onclick={(event) => onSelect(event, collection.id)}
                ><span
                  ><strong>{collection.name}</strong><small
                    >{counts.get(collection.id) ?? 0} links</small
                  ></span
                ></button
              ><button
                class="collection-menu icon-button"
                aria-label={`edit ${collection.name}`}
                onclick={() => onEdit(collection.id)}
                ><MoreVertical size={15} /></button
              >
            </div>
          {/each}
        </div>
      {:else}<div class="section-empty collection-empty">
          <EmptyMono />
          <FileTray size={18} class="text-muted-foreground" />
          <strong>no collections yet.</strong>
          <p>group bookmarks by creating a collection.</p>
        </div>{/if}
    </div>
  </div>
</section>
