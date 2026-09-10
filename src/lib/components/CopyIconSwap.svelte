<script lang="ts">
  import ActionCopy from '$lib/components/icons/ActionCopy.svelte';
  import CopyCheck from '$lib/components/icons/CopyCheck.svelte';

  let {
    copied,
    size = 14
  }: { copied: boolean; size?: number | string } = $props();

  const transition =
    'col-start-1 row-start-1 transition-[opacity,filter,transform] duration-200 ease-in-out will-change-[opacity,filter,transform] motion-reduce:transition-none';
</script>

<span class="inline-grid shrink-0 place-items-center" aria-hidden="true">
  <ActionCopy
    {size}
    class={[
      transition,
      copied
        ? 'scale-25 opacity-0 blur-[2px]'
        : 'scale-100 opacity-100 blur-none'
    ]}
  />
  <CopyCheck
    {size}
    class={[
      transition,
      copied
        ? 'scale-100 opacity-100 blur-none'
        : 'scale-25 opacity-0 blur-[2px]'
    ]}
  />
</span>
