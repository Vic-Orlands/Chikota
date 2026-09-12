<script lang="ts">
  import Globe from '$lib/components/icons/radix/Globe.svelte';

  let { url, size = 18 }: { url: string; size?: number } = $props();
  let failedSources = $state<string[]>([]);

  const host = $derived.by(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  });
  const sources = $derived(
    host
      ? [
          `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=32`,
          `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`,
          `https://${host}/favicon.ico`
        ]
      : []
  );
  const src = $derived(
    sources.find((source) => !failedSources.includes(source))
  );
</script>

<span class="site-favicon">
  {#if src}
    <img
      {src}
      alt=""
      onerror={() => {
        if (src) failedSources = [...failedSources, src];
      }}
    />
  {:else}
    <Globe {size} />
  {/if}
</span>

<style>
  .site-favicon {
    display: contents;
  }
</style>
