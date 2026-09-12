<script lang="ts">
  import ActionBell from '$lib/components/icons/ActionBell.svelte';
  import SaveCloud from '$lib/components/icons/SaveCloud.svelte';
  import Mail from '$lib/components/icons/radix/Mail.svelte';

  let {
    when = $bindable(''),
    email = $bindable(''),
    min,
    error = '',
    saving = false,
    showCancelReminder = false,
    variant = 'modal',
    onsubmit,
    oncancel,
    oncancelReminder
  }: {
    when: string;
    email: string;
    min: string;
    error?: string;
    saving?: boolean;
    showCancelReminder?: boolean;
    variant?: 'modal' | 'popover';
    onsubmit: (event: SubmitEvent) => void;
    oncancel?: () => void;
    oncancelReminder?: () => void;
  } = $props();

  const isPopover = $derived(variant === 'popover');
</script>

<form class={isPopover ? 'reminder-popover-form' : undefined} {onsubmit}>
  <label
    >date and time<input
      type="datetime-local"
      bind:value={when}
      {min}
      required
    /></label
  ><label
    >email <span>optional</span><input
      type="email"
      bind:value={email}
      placeholder={isPopover
        ? 'browser notification'
        : 'leave empty for a browser notification'}
      autocomplete="email"
    /></label
  >
  {#if !isPopover}
    <div class="delivery-note">
      {#if email.trim()}<Mail />scheduled email only{:else}<ActionBell />browser
        notification with a soft sound{/if}
    </div>
  {/if}
  <p class="form-error" role="alert">{error}</p>
  <div class={isPopover ? 'reminder-popover-actions' : 'dialog-actions'}>
    {#if showCancelReminder}
      <button
        type="button"
        class={isPopover
          ? 'plain-button danger-text'
          : 'secondary-button delete-collection'}
        onclick={oncancelReminder}>cancel reminder</button
      >
    {/if}
    {#if !isPopover && oncancel}
      <button
        type="button"
        class="secondary-button"
        disabled={saving}
        onclick={oncancel}>close</button
      >
    {/if}
    <button class="primary-button" disabled={saving}
      >{saving ? 'saving…' : 'set reminder'}{#if isPopover}<SaveCloud
          size={14}
        />{:else}<SaveCloud />{/if}</button
    >
  </div>
</form>
