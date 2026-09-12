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
  const src = $derived(
    sources.find((source) => !failedSources.includes(source))
  );
</script>

<span
  class="site-icon grid place-items-center w-full h-full rounded-full [background:color-mix(in_srgb,_var(--foreground)_6%,_var(--card))] [color:var(--muted-foreground)] [line-height:1] overflow-hidden"
  style:--icon-size="{size}px"
>
  {#if src}
    <img
      class="block [width:var(--icon-size,_18px)] [height:var(--icon-size,_18px)] object-contain"
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
