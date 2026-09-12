import type { Component } from 'svelte';

export type MenuIcon = Component<{ size?: number | string }>;

export type MenuItem = {
  id: string;
  label: string | (() => string);
  shortcut?: string;
  icon?: MenuIcon;
  danger?: boolean;
  visible?: boolean | (() => boolean);
  run: () => void;
};

export type MenuSeparator = {
  id: string;
  separator: true;
  visible?: boolean | (() => boolean);
};

export type MenuEntry = MenuItem | MenuSeparator;

export function isMenuSeparator(entry: MenuEntry): entry is MenuSeparator {
  return 'separator' in entry && entry.separator === true;
}

export function isMenuVisible(entry: MenuEntry): boolean {
  if (entry.visible === undefined) return true;
  return typeof entry.visible === 'function' ? entry.visible() : entry.visible;
}

export function visibleMenuEntries(entries: MenuEntry[]): MenuEntry[] {
  return entries.filter(isMenuVisible);
}

export function menuLabel(item: MenuItem): string {
  return typeof item.label === 'function' ? item.label() : item.label;
}
