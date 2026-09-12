import type { MenuItem } from '$lib/menu';

export type LibraryKeyboardOptions = {
  view: () => string;
  modal: () => string | null;
  hasContext: () => boolean;
  listToolsOpen: () => boolean;
  closeListTools: () => void;
  focusListTools: () => void;
  openCommand: () => void;
  openBookmark: () => void;
  clearSelection: () => void;
  selectAllVisible: () => void;
};

export function handleContextKeys(
  event: KeyboardEvent,
  panel: HTMLElement | undefined,
  onclose: () => void
) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onclose();
  }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const buttons = Array.from(
      panel?.querySelectorAll<HTMLButtonElement>('button') ?? []
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[next]?.focus();
  }
  if (event.key === 'Tab') onclose();
  if (!event.metaKey && !event.ctrlKey && !event.altKey) {
    const shortcut = event.key.toLowerCase();
    const target = panel?.querySelector<HTMLButtonElement>(
      `button[data-shortcut="${shortcut}"]`
    );
    if (target) {
      event.preventDefault();
      target.click();
    }
  }
}

export function handleLibraryKeyboard(
  event: KeyboardEvent,
  options: LibraryKeyboardOptions
) {
  if (options.view() !== 'library') return;
  if (
    event.defaultPrevented ||
    (event.target as HTMLElement).closest('[role="menu"]')
  )
    return;
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    if (options.modal() !== 'command') options.openCommand();
    return;
  }
  if (
    (event.target as HTMLElement).closest('input,textarea,select,dialog') ||
    options.hasContext()
  )
    return;
  if (event.key === 'Escape') {
    if (options.listToolsOpen()) {
      event.preventDefault();
      options.closeListTools();
      options.focusListTools();
      return;
    }
    options.clearSelection();
  }
  if (event.key === 'n') options.openBookmark();
  if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
    event.preventDefault();
    options.selectAllVisible();
  }
}

export function commandActionLabel(action: MenuItem) {
  return typeof action.label === 'function' ? action.label() : action.label;
}
