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
          `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`,
          `https://${host}/favicon.ico`
        ]
      : []
  );
  const src = $derived(sources.find((source) => !failedSources.includes(source)));
</script>

<span class="site-icon" style:--icon-size="{size}px">
  {#if src}
    <img
      {src}
      alt=""
      width={size}
      height={size}
      onerror={() => {
        if (src) failedSources = [...failedSources, src];
      }}
    />
  {:else}
    <Globe {size} />
  {/if}
</span>

<style>
  .site-icon {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: color-mix(in srgb, var(--foreground) 6%, var(--card));
    color: var(--muted-foreground);
    line-height: 1;
    overflow: hidden;
  }
  img {
    display: block;
    width: var(--icon-size, 18px);
    height: var(--icon-size, 18px);
    object-fit: contain;
  }
</style>
