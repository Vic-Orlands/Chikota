<script lang="ts">
  import DeleteTrash from '$lib/components/icons/DeleteTrash.svelte';

  let {
    title,
    description,
    error = '',
    saving = false,
    keepLabel,
    deleteLabel,
    onkeep,
    ondelete
  }: {
    title: string;
    description: string;
    error?: string;
    saving?: boolean;
    keepLabel: string;
    deleteLabel: string;
    onkeep: () => void;
    ondelete: () => void;
  } = $props();
</script>

<div class="dialog-symbol">
  <DeleteTrash size={22} />
</div>
<h2 id="dialog-title">{title}</h2>
<p class="dialog-description">{description}</p>
<p class="form-error" role="alert">{error}</p>
<div class="dialog-actions">
  <button class="secondary-button" disabled={saving} onclick={onkeep}
    >{keepLabel}</button
  ><button
    class="primary-button destructive"
    disabled={saving}
    onclick={ondelete}>{saving ? 'deleting…' : deleteLabel}</button
  >
</div>
