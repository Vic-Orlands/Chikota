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
    d="M19.0625 2.77358C20.3826 2.3964 21.6031 3.61689 21.2259 4.93701L18.0256 16.1379C17.7646 17.0515 17.0505 17.7656 16.1369 18.0266L4.93603 21.2269C3.61592 21.604 2.39543 20.3836 2.7726 19.0634L5.97286 7.86254C6.23388 6.94897 6.94799 6.23485 7.86157 5.97383L19.0625 2.77358ZM9.62425 12C9.62425 10.6883 10.6876 9.625 11.9993 9.625C13.3109 9.625 14.3743 10.6883 14.3743 12C14.3743 13.3117 13.3109 14.375 11.9993 14.375C10.6876 14.375 9.62425 13.3117 9.62425 12Z"
    fill="currentColor"
  />
</svg>
