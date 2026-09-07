<script lang="ts">
  import { tick } from 'svelte';
  import { ArrowRight, Cross2 } from '$lib/components/icons/radix';

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
      title: 'right-click for more.',
      text: 'right-click any bookmark row for edit, pin, reminder, and reading actions. on touch screens, tap its three-dot button. save your first link to try these actions if your library is empty.',
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
    previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    step = 0;
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
    document.querySelector<HTMLButtonElement>('.context-backdrop')?.click();
  }
  async function advance(value: number) {
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
    class="tour-spotlight"
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
    class="tour-card"
    role="dialog"
    aria-modal="false"
    aria-labelledby="tour-title"
    aria-describedby="tour-description"
    tabindex="-1"
    class:positioned
    style:transform={`translate3d(${position.left}px, ${position.top}px, 0)`}
    onkeydown={(event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
      }
    }}
  >
    {#if current.selector}<span
        class="tour-pointer"
        data-side={pointer.side}
        style:--pointer-offset={`${pointer.offset}px`}
        aria-hidden="true"
      ></span>{/if}
    <div class="tour-body">
      {#key step}<div class="tour-copy">
          <div class="tour-top">
            <span>welcome tour · {step + 1} of {steps.length}</span><button
              class="icon-button"
              aria-label="close welcome tour"
              onclick={dismiss}><Cross2 size={14} /></button
            >
          </div>
          <h2 id="tour-title">{current.title}</h2>
          <p id="tour-description">{current.text}</p>
          {#if current.action}<button
              class="tour-action"
              onclick={tryAction}
              disabled={step === 4 && !document.querySelector('.bookmark-row')}
              >{current.action}<ArrowRight size={14} /></button
            >{/if}
        </div>{/key}
      <div class="tour-footer">
        <button class="plain-button" onclick={dismiss}>skip tour</button>
        <div>
          {#if step > 0}<button
              class="secondary-button"
              onclick={() => advance(step - 1)}>back</button
            >{/if}<button
            class="primary-button"
            onclick={() => {
              if (step === steps.length - 1) dismiss();
              else advance(step + 1);
            }}
            >{step === steps.length - 1
              ? 'start collecting'
              : 'next'}<ArrowRight size={13} /></button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-spotlight {
    position: fixed;
    top: 0;
    left: 0;
    opacity: 0;
    z-index: 49;
    border-radius: 8px;
    border: 2px solid var(--accent-text);
    box-shadow: 0 0 0 200vmax #0005;
    pointer-events: none;
    will-change: opacity;
  }
  .tour-spotlight.centered {
    border: 0;
  }
  .tour-card {
    position: fixed;
    top: 0;
    left: 0;
    opacity: 0;
    z-index: 60;
    width: min(340px, calc(100vw - 24px));
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow);
    outline: none;
  }
  .tour-body {
    max-height: calc(100dvh - 26px);
    overflow-y: auto;
    padding: 20px;
  }
  .positioned {
    opacity: 1;
  }
  .tour-spotlight.positioned {
    opacity: 0;
  }
  .tour-spotlight.visible {
    opacity: 1;
  }
  .tour-pointer {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--card);
    transform: rotate(45deg);
    border: 1px solid var(--border);
  }
  .tour-pointer[data-side='top'] {
    top: -6px;
    left: calc(var(--pointer-offset) - 5px);
    border-right: 0;
    border-bottom: 0;
  }
  .tour-pointer[data-side='bottom'] {
    bottom: -6px;
    left: calc(var(--pointer-offset) - 5px);
    border-left: 0;
    border-top: 0;
  }
  .tour-pointer[data-side='left'] {
    left: -6px;
    top: calc(var(--pointer-offset) - 5px);
    border-right: 0;
    border-top: 0;
  }
  .tour-pointer[data-side='right'] {
    right: -6px;
    top: calc(var(--pointer-offset) - 5px);
    border-left: 0;
    border-bottom: 0;
  }
  @media (prefers-reduced-motion: no-preference) {
    .tour-card.positioned {
      transition:
        transform 260ms cubic-bezier(0.645, 0.045, 0.355, 1),
        opacity 180ms ease-out;
    }
    .tour-spotlight.positioned {
      transition: opacity 120ms ease-out;
    }
    .tour-copy {
      animation: tour-copy-in 180ms ease-out;
    }
  }
  @keyframes tour-copy-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tour-card,
    .tour-spotlight,
    .tour-copy {
      transition: none;
      animation: none;
    }
  }
  .tour-top,
  .tour-footer,
  .tour-footer > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tour-top,
  .tour-footer {
    justify-content: space-between;
  }
  .tour-top {
    font-size: 10px;
    color: var(--muted-foreground);
    margin: -6px -6px 12px 0;
  }
  h2 {
    margin: 0;
    font-size: 36px;
    line-height: 1.2;
    letter-spacing: normal;
    font-weight: 400;
  }
  p {
    margin: 10px 0 16px;
    font-size: 12px;
    line-height: 1.8;
    color: var(--muted-foreground);
  }
  .tour-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    border: 1px solid var(--border);
    background: var(--sidebar);
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
    text-align: left;
  }
  .tour-footer {
    margin-top: 22px;
  }
  button:focus-visible {
    outline: 2px solid var(--accent-text);
    outline-offset: 2px;
  }
</style>
