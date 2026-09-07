<script lang="ts">
  let { size = 22 }: { size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 32 32"
  fill="none"
  aria-hidden="true"
>
  <path
    d="M12.1 6.4c1.15 5.4 2.25 11 2.95 19.2"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
  />
  <path
    d="M16 5.8v20"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
  />
  <path
    d="M19.9 6.4c-1.15 5.4-2.25 11-2.95 19.2"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
  />
  <path
    d="M9.4 15.8h13.2"
    stroke="currentColor"
    stroke-width="2.15"
    stroke-linecap="round"
  />
</svg>
