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
    content="A quiet home for your favorite corners of the internet. Save, collect, and rediscover with Chikota."
  /></svelte:head
>
{@render children()}
<Toaster />
