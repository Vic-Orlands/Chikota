<script lang="ts">
  import SaveCloud from '$lib/components/icons/SaveCloud.svelte';
  import { FileTray } from '$lib/components/icons/radix';

  let {
    name = $bindable(''),
    editing = false,
    confirmDelete = false,
    error = '',
    onsubmit,
    oncancel,
    ondelete
  }: {
    name: string;
    editing?: boolean;
    confirmDelete?: boolean;
    error?: string;
    onsubmit: (event: SubmitEvent) => void;
    oncancel: () => void;
    ondelete?: () => void;
  } = $props();
</script>

<div class="dialog-symbol">
  <FileTray size={22} />
</div>
<h2 id="dialog-title">
  {editing ? 'rename collection.' : 'a place for an interest.'}
</h2>
<p class="dialog-description">
  {editing
    ? 'change its name or remove it from chikota.'
    : 'keep related links together in a collection.'}
</p>
<form class="collection-form" {onsubmit}>
  <label
    ><input
      bind:value={name}
      placeholder="collection name"
      required
      maxlength="60"
    /></label
  >
  <p class="form-error" role="alert">{error}</p>
  <div class="dialog-actions">
    {#if editing && ondelete}<button
        type="button"
        class="secondary-button delete-collection"
        class:danger-text={confirmDelete}
        onclick={ondelete}>{confirmDelete ? 'confirm delete' : 'delete'}</button
      >{/if}
    <button type="button" class="secondary-button" onclick={oncancel}
      >cancel</button
    ><button class="primary-button"
      >{editing ? 'save name' : 'create collection'}<SaveCloud /></button
    >
  </div>
</form>
