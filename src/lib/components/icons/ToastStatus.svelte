<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';

  let {
    variant,
    size = 16,
    ...props
  }: SVGAttributes<SVGSVGElement> & {
    variant: 'success' | 'error' | 'info' | 'warning';
    size?: number | string;
  } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
  {...props}
>
  {#if variant === 'success'}
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="m7.75 12.25 2.75 2.75 5.75-6"
      stroke="var(--normal-bg)"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {:else if variant === 'error'}
    <path
      d="M8.18 2.5h7.64L21.5 8.18v7.64l-5.68 5.68H8.18L2.5 15.82V8.18L8.18 2.5Z"
      fill="currentColor"
    />
    <path
      d="m8.75 8.75 6.5 6.5m0-6.5-6.5 6.5"
      stroke="var(--normal-bg)"
      stroke-width="1.8"
      stroke-linecap="round"
    />
  {:else if variant === 'warning'}
    <path
      d="M10.27 3.04a2 2 0 0 1 3.46 0l8.14 14.1A2 2 0 0 1 20.14 20H3.86a2 2 0 0 1-1.73-2.86l8.14-14.1Z"
      fill="currentColor"
    />
    <path
      d="M12 8v5"
      stroke="var(--normal-bg)"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <circle cx="12" cy="16.5" r="1" fill="var(--normal-bg)" />
  {:else}
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M12 10.75V17"
      stroke="var(--normal-bg)"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <circle cx="12" cy="7.5" r="1.15" fill="var(--normal-bg)" />
  {/if}
</svg>
