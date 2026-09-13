<script lang="ts">
  import { tick } from 'svelte';
  import { ArrowRight, Cross2 } from '$lib/components/icons/radix';
  import TourNext from '$lib/components/icons/TourNext.svelte';

  let {
    open,
    suspended = false,
    ondismiss
  }: { open: boolean; suspended?: boolean; ondismiss: () => void } = $props();
  let step = $state(0);
  let target = $state({ top: 0, left: 0, width: 0, height: 0 });
  let position = $state({ top: 0, left: 0 });
  let pointer = $state({ side: 'top', offset: 24 });
  let positioned = $state(false);
  let spotlightVisible = $state(false);
  let launching = $state(false);
  let panel = $state<HTMLElement>();
  let previousFocus: HTMLElement | null = null;
  const steps = [
    {
      title: 'welcome to chikota.',
      text: 'save the links worth keeping, and find them again. let’s take a quick walk around your library.',
      selector: '',
      action: ''
    },
    {
      title: 'start with a good link.',
      text: 'this button opens the bookmark form. paste a url, give it a name, and save. close the form to continue the tour.',
      selector: '[data-tour="save"]',
      action: 'open the bookmark form'
    },
    {
      title: 'give your links a home.',
      text: 'create a collection for a topic or project, then choose it when saving a bookmark. your collections live here.',
      selector: '[data-tour="collections"]',
      action: 'create a collection'
    },
    {
      title: 'search from anywhere.',
      text: 'click the search icon, or press cmd+k on mac / ctrl+k on windows. search your saved links or choose an action. close search to continue.',
      selector: '[data-tour="search"]',
      action: 'try search'
    },
    {
      title: 'bookmark actions, close by.',
      text: 'use a bookmark’s three-dot button for edit, pin, reminder, and reading actions. save your first link to try these actions if your library is empty.',
      selector: '.bookmark-row',
      fallback: '.library-section',
      action: 'show bookmark actions'
    },
    {
      title: 'work with a few at once.',
      text: 'the mixer holds select, select all, and collapse. select bookmarks to reveal their shared action bar. you can also shift-click a range or drag across rows.',
      selector: '[data-tour="mixer"]',
      action: 'open selection tools'
    },
    {
      title: 'everything else, together.',
      text: 'your account menu brings together appearance, reminders, extension setup, and sign-in. you can replay this tour here whenever you need it.',
      selector: '[data-tour="account"]',
      action: 'open account menu'
    },
    {
      title: 'make yourself at home.',
      text: 'you’re ready to start collecting. save a link, build a collection, and let the good finds gather here.',
      selector: '',
      action: ''
    }
  ];
  let current = $derived(steps[step]);
  function element() {
    return (
      document.querySelector<HTMLElement>(current.selector || 'body') ||
      document.querySelector<HTMLElement>(current.fallback || 'body')
    );
  }
  function place() {
    if (!open || suspended) return;
    const rect = current.selector ? element()?.getBoundingClientRect() : null;
    target = rect
      ? {
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12
        }
      : { top: 0, left: 0, width: 0, height: 0 };
    const width = Math.min(340, window.innerWidth - 24);
    const height = panel?.offsetHeight || 260;
    const menu = document
      .querySelector<HTMLElement>('[role="menu"]')
      ?.getBoundingClientRect();
    if (!rect) {
      position = {
        left: (window.innerWidth - width) / 2,
        top: Math.max(12, (window.innerHeight - height) / 2)
      };
      positioned = true;
      return;
    }
    const gap = 18;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clamp = (value: number, max: number) =>
      Math.max(12, Math.min(value, max - 12));
    const candidates = [
      {
        side: 'top',
        left: clamp(centerX - width / 2, window.innerWidth - width),
        top: rect.bottom + gap
      },
      {
        side: 'bottom',
        left: clamp(centerX - width / 2, window.innerWidth - width),
        top: rect.top - height - gap
      },
      {
        side: 'right',
        left: rect.left - width - gap,
        top: clamp(centerY - height / 2, window.innerHeight - height)
      },
      {
        side: 'left',
        left: rect.right + gap,
        top: clamp(centerY - height / 2, window.innerHeight - height)
      }
    ];
    function score(candidate: (typeof candidates)[number]) {
      const overflow =
        Math.max(12 - candidate.left, 0) +
        Math.max(candidate.left + width + 12 - window.innerWidth, 0) +
        Math.max(12 - candidate.top, 0) +
        Math.max(candidate.top + height + 12 - window.innerHeight, 0);
      const overlap = menu
        ? Math.max(
            0,
            Math.min(candidate.left + width, menu.right) -
              Math.max(candidate.left, menu.left)
          ) *
          Math.max(
            0,
            Math.min(candidate.top + height, menu.bottom) -
              Math.max(candidate.top, menu.top)
          )
        : 0;
      return overflow * 10000 + overlap;
    }
    const best = candidates.reduce((best, candidate) =>
      score(candidate) < score(best) ? candidate : best
    );
    position = {
      left: clamp(best.left, window.innerWidth - width),
      top: clamp(best.top, window.innerHeight - height)
    };
    pointer = {
      side: best.side,
      offset:
        best.side === 'top' || best.side === 'bottom'
          ? Math.max(18, Math.min(centerX - position.left, width - 18))
          : Math.max(18, Math.min(centerY - position.top, height - 18))
    };
    positioned = true;
  }

  $effect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const blockScroll = (event: Event) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest('.tour-card, dialog, [role="dialog"]')
      )
        event.preventDefault();
    };
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('wheel', blockScroll);
      window.removeEventListener('touchmove', blockScroll);
    };
  });
  $effect(() => {
    if (!open) return;
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    step = 0;
    launching = true;
    positioned = false;
    spotlightVisible = false;
  });
  $effect(() => {
    if (!open || suspended) return;
    const index = step;
    void tick().then(() => {
      if (index !== step) return;
      if (current.selector)
        element()?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      place();
      requestAnimationFrame(() => (spotlightVisible = true));
      panel?.focus({ preventScroll: true });
    });
    const observer = new ResizeObserver(place);
    if (panel) observer.observe(panel);
    const menus = new MutationObserver(place);
    menus.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      menus.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  });
  function dismiss() {
    closeMenus();
    ondismiss();
    previousFocus?.focus({ preventScroll: true });
  }
  function closeMenus() {
    document
      .querySelectorAll<HTMLButtonElement>('[data-tour][aria-expanded="true"]')
      .forEach((trigger) => trigger.click());
    document
      .querySelector<HTMLButtonElement>('.bookmark-context-backdrop')
      ?.click();
  }
  async function advance(value: number) {
    launching = false;
    spotlightVisible = false;
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    closeMenus();
    step = value;
  }
  function tryAction() {
    if (step === 2)
      document
        .querySelector<HTMLButtonElement>(
          '[data-tour="collections"] .plain-button'
        )
        ?.click();
    else if (step === 4)
      document
        .querySelector<HTMLButtonElement>(
          '.bookmark-row [aria-label^="more options"]'
        )
        ?.click();
    else element()?.click();
  }
</script>

{#if open && !suspended}
  <div
    class="tour-spotlight fixed [top:0] [left:0] opacity-0 [z-index:49] [border-radius:8px] [border:2px_solid_var(--accent-text)] [box-shadow:0_0_0_200vmax_#0005] pointer-events-none [will-change:opacity] [&.centered]:border-0 [&.positioned]:opacity-0 [&.visible]:opacity-100 motion-safe:[&.positioned]:[transition:opacity_120ms_ease-out] motion-reduce:transition-none motion-reduce:[animation:none]"
    class:centered={!current.selector}
    class:positioned
    class:visible={spotlightVisible}
    style:transform={`translate3d(${target.left}px, ${target.top}px, 0)`}
    style:width={`${target.width}px`}
    style:height={`${target.height}px`}
    aria-hidden="true"
  ></div>
  <div
    bind:this={panel}
    class={[
      'tour-card fixed [top:0] [left:0] opacity-0 [z-index:60] [width:min(340px,_calc(100vw_-_24px))] p-0 [border:1px_solid_var(--border)] [border-radius:8px] [background:var(--card)] [color:var(--foreground)] [box-shadow:var(--shadow)] outline-none [font-family:var(--font-sans)] [font-size:var(--modal-body-font-size)] [&.positioned]:opacity-100 [&_button:focus-visible]:[outline:2px_solid_var(--accent-text)] [&_button:focus-visible]:[outline-offset:2px] motion-safe:[&.positioned:not(.centered)]:[transition:transform_260ms_cubic-bezier(0.645,_0.045,_0.355,_1),_opacity_180ms_ease-out] motion-safe:[&.centered.positioned.launching]:[transform-origin:center] motion-safe:[&.centered.positioned.launching]:transition-none motion-safe:[&.centered.positioned.launching]:[animation:tour-launch-in_220ms_cubic-bezier(0.22,_1,_0.36,_1)_both] motion-safe:[&.centered.positioned.launching]:[will-change:scale,_opacity] motion-safe:[&.launching_.tour-copy]:[animation:none] motion-reduce:transition-none motion-reduce:[animation:none]'
    ]}
    class:centered={!current.selector}
    class:launching
    role="dialog"
    aria-modal="false"
    aria-labelledby="tour-title"
    aria-describedby="tour-description"
    tabindex="-1"
    class:positioned
    style:transform={`translate3d(${position.left}px, ${position.top}px, 0)`}
    onanimationend={(event) => {
      if (event.animationName === 'tour-launch-in') launching = false;
    }}
    onkeydown={(event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
      }
    }}
  >
    {#if current.selector}<span
        class="tour-pointer absolute [width:10px] [height:10px] [background:var(--card)] [transform:rotate(45deg)] [border:1px_solid_var(--border)] [&[data-side=top]]:[top:-6px] [&[data-side=top]]:[left:calc(var(--pointer-offset)_-_5px)] [&[data-side=top]]:[border-right:0] [&[data-side=top]]:[border-bottom:0] [&[data-side=bottom]]:[bottom:-6px] [&[data-side=bottom]]:[left:calc(var(--pointer-offset)_-_5px)] [&[data-side=bottom]]:[border-left:0] [&[data-side=bottom]]:[border-top:0] [&[data-side=left]]:[left:-6px] [&[data-side=left]]:[top:calc(var(--pointer-offset)_-_5px)] [&[data-side=left]]:[border-right:0] [&[data-side=left]]:[border-top:0] [&[data-side=right]]:[right:-6px] [&[data-side=right]]:[top:calc(var(--pointer-offset)_-_5px)] [&[data-side=right]]:[border-left:0] [&[data-side=right]]:[border-bottom:0]"
        data-side={pointer.side}
        style:--pointer-offset={`${pointer.offset}px`}
        aria-hidden="true"
      ></span>{/if}
    <div
      class="tour-body [max-height:calc(100dvh_-_26px)] overflow-y-auto [padding:20px]"
    >
      {#key step}<div
          class="tour-copy motion-safe:[animation:tour-copy-in_180ms_ease-out] motion-reduce:transition-none motion-reduce:[animation:none]"
        >
          <div
            class="tour-top flex items-center [gap:8px] justify-between [font-size:10px] [color:var(--muted-foreground)] [margin:-6px_-6px_12px_0]"
          >
            <span>welcome tour · {step + 1} of {steps.length}</span><button
              class="icon-button inline-grid place-items-center [width:30px] [height:30px] p-0 border-0 bg-none [color:var(--muted-foreground)] [border-radius:5px] [&:hover]:[background:var(--secondary)] [&:hover]:[color:var(--foreground)] [&.small]:[width:24px] [&.small]:[height:24px] motion-safe:[transition:background-color_140ms_ease]"
              aria-label="close welcome tour"
              onclick={dismiss}><Cross2 size={14} /></button
            >
          </div>
          <h2
            class="m-0 [font-size:36px] [line-height:1.2] [letter-spacing:normal] font-normal"
            id="tour-title"
          >
            {current.title}
          </h2>
          <p
            class="[margin:10px_0_16px] [font-size:var(--modal-body-font-size)] [line-height:1.8] [color:var(--muted-foreground)]"
            id="tour-description"
          >
            {current.text}
          </p>
          {#if current.action}<button
              class="tour-action flex items-center justify-between w-full [border:1px_solid_var(--border)] [background:var(--sidebar)] [padding:10px] [border-radius:6px] [font-size:var(--modal-body-font-size)] text-left"
              onclick={tryAction}
              disabled={step === 4 && !document.querySelector('.bookmark-row')}
              >{current.action}<ArrowRight size={14} /></button
            >{/if}
        </div>{/key}
      <div
        class="tour-footer flex items-center [gap:8px] [&>div]:flex [&>div]:items-center [&>div]:[gap:8px] justify-between [margin-top:22px]"
      >
        <button
          class="plain-button [&_svg]:block inline-flex items-center [gap:var(--icon-text-gap)] [padding:5px_6px] border-0 [border-radius:5px] bg-transparent [color:var(--foreground)] [font-size:var(--body-font-size)] whitespace-nowrap [&:hover]:[background:var(--secondary)] [&.control-active]:[background:var(--secondary)] [&.control-active]:[color:var(--foreground)] max-[520px]:[padding:6px_4px] max-[520px]:[font-size:var(--body-font-size)]"
          onclick={dismiss}>skip tour</button
        >
        <div>
          {#if step > 0}<button
              class="secondary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--card)] [border-color:var(--border)] [&:hover]:[background:var(--secondary)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
              onclick={() => advance(step - 1)}>back</button
            >{/if}<button
            class="primary-button inline-flex items-center justify-center [gap:var(--icon-text-gap)] [border:1px_solid_transparent] [border-radius:6px] [padding:7px_10px] [font-size:var(--body-font-size)] font-medium [min-height:30px] whitespace-nowrap [background:var(--primary)] [color:var(--primary-foreground)] [&:hover]:[filter:brightness(1.12)] motion-safe:[transition:transform_120ms_ease] motion-safe:[&:active]:[transform:scale(0.97)]"
            onclick={() => {
              if (step === steps.length - 1) dismiss();
              else advance(step + 1);
            }}
            >{step === steps.length - 1 ? 'start collecting' : 'next'}<TourNext
            /></button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
