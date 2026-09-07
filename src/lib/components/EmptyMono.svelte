<script lang="ts">
  const uid = $props.id();
</script>

<div class="empty-mono" aria-hidden="true">
  <svg width="100%" height="100%">
    <defs>
      <filter id={`${uid}-grain`}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <pattern
        id={`${uid}-dither`}
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
      >
        <rect width="1" height="1" fill="currentColor" opacity="0.14" />
        <rect x="2" y="2" width="1" height="1" fill="currentColor" opacity="0.08" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${uid}-dither)`} />
    <rect
      width="100%"
      height="100%"
      filter={`url(#${uid}-grain)`}
      opacity="0.06"
    />
  </svg>
</div>

<style>
  .empty-mono {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    border-radius: inherit;
    color: var(--foreground);
    background: var(--sidebar);
    pointer-events: none;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
