import { tick } from 'svelte';

export function useSlidePanel(unmountDelay = 350) {
  let mounted = $state(false);
  let open = $state(false);
  let element = $state<HTMLElement | undefined>(undefined);
  let closeTimer: number | undefined;

  async function openPanel() {
    if (closeTimer !== undefined) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
    mounted = true;
    await tick();
    requestAnimationFrame(() => {
      open = true;
      element?.focus({ preventScroll: true });
    });
  }

  function closePanel() {
    open = false;
    if (closeTimer !== undefined) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      mounted = false;
      closeTimer = undefined;
    }, unmountDelay);
  }

  function destroy() {
    if (closeTimer !== undefined) {
      window.clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  }

  return {
    get mounted() {
      return mounted;
    },
    get open() {
      return open;
    },
    get element() {
      return element;
    },
    set element(node: HTMLElement | undefined) {
      element = node;
    },
    openPanel,
    closePanel,
    destroy
  };
}
