<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';

  let {
    size = 20,
    ...props
  }: SVGAttributes<SVGSVGElement> & { size?: number | string } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
  {...props}
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM9.75 8.75C9.33579 8.75 9 9.08579 9 9.5V12.5C9 12.9142 9.33579 13.25 9.75 13.25C10.1642 13.25 10.5 12.9142 10.5 12.5V9.5C10.5 9.08579 10.1642 8.75 9.75 8.75ZM14.25 8.75C13.8358 8.75 13.5 9.08579 13.5 9.5V12.5C13.5 12.9142 13.8358 13.25 14.25 13.25C14.6642 13.25 15 12.9142 15 12.5V9.5C15 9.08579 14.6642 8.75 14.25 8.75Z"
    fill="currentColor"
  ></path>
</svg>
