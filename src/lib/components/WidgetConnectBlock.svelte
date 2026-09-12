<script lang="ts">
  import CopyIconSwap from '$lib/components/CopyIconSwap.svelte';

  let {
    signedIn,
    token,
    busy,
    error,
    copied,
    platform,
    oncreate,
    oncopy,
    onsignin
  }: {
    signedIn: boolean;
    token: string;
    busy: boolean;
    error: string;
    copied: boolean;
    platform: 'mac' | 'linux';
    oncreate: () => void;
    oncopy: () => void;
    onsignin: () => void;
  } = $props();

  const isLinux = $derived(platform === 'linux');
</script>

{#if signedIn}
  {#if token}
    <button
      class={['widget-token', isLinux && 'linux-widget-token']}
      aria-label={copied
        ? isLinux
          ? 'connection code copied'
          : 'mac connection code copied'
        : isLinux
          ? 'copy connection code'
          : 'copy mac connection code'}
      onclick={oncopy}
      ><code>{token}</code><CopyIconSwap {copied} size={14} /></button
    ><small class="widget-token-note"
      >{isLinux
        ? 'shown once. paste this code into the linux widget.'
        : 'shown once. paste this code into the mac app.'}</small
    >
  {:else}
    <button
      class={[
        'secondary-button widget-connect-action',
        isLinux && 'linux-connect-action'
      ]}
      disabled={busy}
      onclick={oncreate}
      >{busy
        ? 'creating…'
        : isLinux
          ? 'create connection code'
          : 'create mac connection code'}</button
    >
  {/if}
  <p class="form-error" role="alert">{error}</p>
{:else}
  <button
    class={[
      'secondary-button widget-connect-action',
      isLinux && 'linux-connect-action'
    ]}
    onclick={onsignin}>sign in to connect the widget</button
  >
{/if}
