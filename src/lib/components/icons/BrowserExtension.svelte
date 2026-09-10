<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements';
  let { size = 16, ...props }: SVGAttributes<SVGSVGElement> & { size?: number | string } = $props();
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path fill-rule="evenodd" clip-rule="evenodd" d="M3 5.75C3 4.23122 4.23122 3 5.75 3H18.25C19.7688 3 21 4.23122 21 5.75V18.25C21 19.7688 19.7688 21 18.25 21H5.75C4.23122 21 3 19.7688 3 18.25V5.75ZM14.5572 8.36844C15.2104 8.1903 15.8097 8.78965 15.6316 9.44283L14.5122 13.5474C14.3841 14.0171 14.0171 14.384 13.5474 14.5121L9.44286 15.6316C8.78968 15.8097 8.19033 15.2103 8.36847 14.5572L9.48789 10.4526C9.61599 9.98291 9.98294 9.61596 10.4527 9.48786L14.5572 8.36844Z" fill="currentColor"/></svg>
