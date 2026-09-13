<script lang="ts">
  let {
    size = 'md',
    color = 'primary'
  }: {
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'primary' | 'accent' | 'muted';
  } = $props();

  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-[1.5px]',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-2'
  };

  const colors = {
    primary: 'border-primary border-t-transparent',
    accent: 'border-accent border-t-transparent',
    muted: 'border-muted-foreground border-t-transparent'
  };
</script>

<div
  class="rounded-full spinner {sizes[size]} {colors[color]}"
  role="status"
  aria-label="loading"
>
  <span
    class="sr-only absolute [width:1px] [height:1px] p-0 [margin:-1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap border-0"
    >loading...</span
  >
</div>
