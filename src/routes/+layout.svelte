<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  let { children } = $props();
  onMount(() => themeStore.init());
</script>

<svelte:head
  ><link rel="icon" href="/favicon.svg" /><meta
    name="description"
    content="chikọta — save links, pin the ones you need, find them again."
  /></svelte:head
>
{@render children()}
<Toaster />
