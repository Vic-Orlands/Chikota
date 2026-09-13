<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  import GuideLauncher from './GuideLauncher.svelte';

  let {
    size = 20,
    ...props
  }: SVGAttributes<SVGSVGElement> & { size?: number | string } = $props();
</script>

<GuideLauncher {size} {...props} />
