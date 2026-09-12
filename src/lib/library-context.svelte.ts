import { createContext } from 'svelte';
import type { Bookmark } from '$lib/types';
import type { BookmarkFlags } from '$lib/stores/flags.svelte';
import type { ReminderStatus } from '$lib/stores/reminders.svelte';

export type LibraryContext = {
  flags: BookmarkFlags;
  selected: string[];
  selectMode: boolean;
  copiedTargets: string[];
  contextBookmarkId?: string;
  dragging: boolean;
  visibleIds: string[];
  reminderStatusById: Map<string, ReminderStatus>;
  formatReminder: (value: Date) => string;
  toggleFlag: (id: string, key: 'pinned' | 'read') => void;
  recordOpen: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectBookmark: (id: string) => void;
  selectBookmarkRange: (
    event: MouseEvent,
    id: string,
    orderedIds: string[]
  ) => boolean;
  showContext: (event: MouseEvent, bookmark?: Bookmark) => void;
  showReminderPopover: (event: MouseEvent, bookmark: Bookmark) => void;
  copyLink: (bookmark: Bookmark) => void;
  clearDragging: () => void;
};

export const [getLibraryContext, setLibraryContext] =
  createContext<LibraryContext>();
