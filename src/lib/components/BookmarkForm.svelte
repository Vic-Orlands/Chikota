<script lang="ts">
  import type { Category } from '$lib/types';
  import SaveCloud from '$lib/components/icons/SaveCloud.svelte';
  import { Bookmark as BookmarkIcon } from '$lib/components/icons/radix';

  let {
    url = $bindable(''),
    title = $bindable(''),
    note = $bindable(''),
    collection = $bindable(''),
    collections,
    editing = false,
    error = '',
    saving = false,
    onsubmit,
    oncancel
  }: {
    url: string;
    title: string;
    note: string;
    collection: string;
    collections: Category[];
    editing?: boolean;
    error?: string;
    saving?: boolean;
    onsubmit: (event: SubmitEvent) => void;
    oncancel: () => void;
  } = $props();
</script>

<div class="dialog-symbol">
  <BookmarkIcon size={22} />
</div>
<h2 id="dialog-title">
  {editing ? 'a little fine-tuning.' : 'a good find, kept.'}
</h2>
<p class="dialog-description">
  {editing
    ? 'update the details that help you find it again.'
    : 'save a link now. come back when you have a moment.'}
</p>
<form class="bookmark-form" {onsubmit}>
  <label
    ><input
      bind:value={url}
      placeholder="url"
      required
      aria-describedby="form-error"
    /></label
  ><label
    ><input
      bind:value={title}
      placeholder="title (optional)"
      maxlength="300"
    /></label
  ><label
    ><textarea
      bind:value={note}
      placeholder="note (optional)"
      rows="2"
      maxlength="2000"></textarea></label
  >
  <label
    ><select bind:value={collection}
      ><option value="">no collection</option
      >{#each collections as item (item.id)}<option value={item.id}
          >{item.name}</option
        >{/each}</select
    ></label
  >
  <p class="form-error" id="form-error" role="alert">{error}</p>
  <div class="dialog-actions">
    <button
      type="button"
      class="secondary-button"
      disabled={saving}
      onclick={oncancel}>cancel</button
    ><button class="primary-button" disabled={saving}
      >{saving
        ? 'saving…'
        : editing
          ? 'save changes'
          : 'save bookmark'}<SaveCloud /></button
    >
  </div>
</form>
