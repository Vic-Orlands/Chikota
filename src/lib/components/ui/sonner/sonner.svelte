<script lang="ts">
  import { Loader2Icon } from '$lib/components/icons/radix';
  import ToastStatus from '$lib/components/icons/ToastStatus.svelte';

  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps
  } from 'svelte-sonner';
  import { mode } from 'mode-watcher';

  let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
  theme={mode.current}
  class="toaster group [--normal-bg:var(--color-popover)] [--normal-border:var(--color-border)] [--normal-text:var(--color-popover-foreground)]"
  {...restProps}
  >{#snippet loadingIcon()}
    <Loader2Icon class="size-4 animate-spin" />
  {/snippet}
  {#snippet successIcon()}
    <ToastStatus variant="success" class="size-4" />
  {/snippet}
  {#snippet errorIcon()}
    <ToastStatus variant="error" class="size-4" />
  {/snippet}
  {#snippet infoIcon()}
    <ToastStatus variant="info" class="size-4" />
  {/snippet}
  {#snippet warningIcon()}
    <ToastStatus variant="warning" class="size-4" />
  {/snippet}
</Sonner>
