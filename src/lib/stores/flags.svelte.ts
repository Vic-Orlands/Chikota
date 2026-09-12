import type { Bookmark } from '$lib/types';

export type BookmarkFlag = {
  pinned?: boolean;
  read?: boolean;
  openedAt?: string;
};

export type BookmarkFlags = Record<string, BookmarkFlag>;

export function createFlagsStore(options: {
  scopeKey: () => string;
  signedIn: () => boolean;
  persistRemote?: (
    ids: string[],
    key: 'pinned' | 'read',
    value: boolean
  ) => Promise<void>;
  persistOpened?: (id: string, openedAt: Date) => Promise<void>;
  onError: (message: string) => void;
  onChanged?: () => void;
}) {
  let flags = $state<BookmarkFlags>({});

  function storageKey() {
    return `chikota-flags-${options.scopeKey()}`;
  }

  function persist(next: BookmarkFlags) {
    localStorage.setItem(storageKey(), JSON.stringify(next));
    flags = next;
  }

  function hydrateFromStorage() {
    flags = JSON.parse(localStorage.getItem(storageKey()) || '{}');
  }

  function hydrateFromBookmarks(items: Bookmark[]) {
    flags = Object.fromEntries(
      items.map((bookmark) => [
        bookmark.id,
        {
          pinned: bookmark.isPinned,
          read: bookmark.isRead,
          openedAt: bookmark.openedAt?.toISOString()
        }
      ])
    );
  }

  function applyStorageEvent(event: StorageEvent) {
    if (event.key !== storageKey()) return false;
    try {
      flags = JSON.parse(event.newValue || '{}');
    } catch {
      flags = {};
    }
    return true;
  }

  function toggleFlag(id: string, key: 'pinned' | 'read') {
    setFlags([id], key, !flags[id]?.[key]);
  }

  function setFlags(ids: string[], key: 'pinned' | 'read', value: boolean) {
    const next = { ...flags };
    for (const id of ids) next[id] = { ...next[id], [key]: value };
    try {
      persist(next);
      if (options.signedIn() && options.persistRemote)
        void options
          .persistRemote(ids, key, value)
          .catch(() => options.onError('could not sync this change'));
    } catch {
      options.onError('could not save this change');
    }
    options.onChanged?.();
  }

  function recordOpen(id: string) {
    const openedAt = new Date().toISOString();
    const next = {
      ...flags,
      [id]: { ...flags[id], openedAt }
    };
    try {
      persist(next);
      if (options.signedIn() && options.persistOpened)
        void options
          .persistOpened(id, new Date(openedAt))
          .catch(() => options.onError('could not sync opened status'));
    } catch {
      options.onError('could not update recently opened bookmarks');
    }
  }

  function openedWithinSevenDays(id: string) {
    const openedAt = Date.parse(flags[id]?.openedAt || '');
    const elapsed = Date.now() - openedAt;
    return Number.isFinite(openedAt) && elapsed >= 0 && elapsed <= 604_800_000;
  }

  return {
    get flags() {
      return flags;
    },
    set flags(value: BookmarkFlags) {
      flags = value;
    },
    storageKey,
    hydrateFromStorage,
    hydrateFromBookmarks,
    applyStorageEvent,
    toggleFlag,
    setFlags,
    recordOpen,
    openedWithinSevenDays
  };
}
