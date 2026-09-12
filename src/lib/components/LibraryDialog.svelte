<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Cross2 } from '$lib/components/icons/radix';

  export type LibraryModal =
    | 'bookmark'
    | 'collection'
    | 'collection-edit'
    | 'command'
    | 'settings'
    | 'delete'
    | 'delete-collections'
    | 'reminder'
    | null;

  let {
    dialog = $bindable(),
    modal,
    commandPosition,
    saving = false,
    onclose,
    commandPane,
    bookmarkPane,
    collectionPane,
    reminderPane,
    settingsPane,
    deletePane,
    deleteCollectionsPane
  }: {
    dialog?: HTMLDialogElement;
    modal: LibraryModal;
    commandPosition: { top: number; left: number; width: number };
    saving?: boolean;
    onclose: () => void;
    commandPane?: Snippet;
    bookmarkPane?: Snippet;
    collectionPane?: Snippet;
    reminderPane?: Snippet;
    settingsPane?: Snippet;
    deletePane?: Snippet;
    deleteCollectionsPane?: Snippet;
  } = $props();
</script>

<dialog
  bind:this={dialog}
  class="app-dialog"
  class:command-positioned={modal === 'command'}
  class:settings-dialog={modal === 'settings'}
  style:top={modal === 'command' ? `${commandPosition.top}px` : undefined}
  style:left={modal === 'command' ? `${commandPosition.left}px` : undefined}
  style:width={modal === 'command' ? `${commandPosition.width}px` : undefined}
  aria-labelledby="dialog-title"
  {onclose}
  onclick={(event) => {
    if (event.target === dialog && !saving) dialog?.close();
  }}
  oncancel={(event) => {
    if (saving) event.preventDefault();
  }}
>
  {#if modal}<div class="dialog-inner">
      {#if modal !== 'command'}<button
          class="dialog-close icon-button"
          aria-label="close dialog"
          disabled={saving}
          onclick={() => dialog?.close()}><Cross2 /></button
        >{/if}
      {#if modal === 'command'}
        {@render commandPane?.()}
      {:else if modal === 'bookmark'}
        {@render bookmarkPane?.()}
      {:else if modal === 'collection' || modal === 'collection-edit'}
        {@render collectionPane?.()}
      {:else if modal === 'reminder'}
        {@render reminderPane?.()}
      {:else if modal === 'settings'}
        {@render settingsPane?.()}
      {:else if modal === 'delete'}
        {@render deletePane?.()}
      {:else if modal === 'delete-collections'}
        {@render deleteCollectionsPane?.()}
      {/if}
    </div>{/if}
</dialog>
