import { writable, derived, get } from 'svelte/store';
import type { Bookmark } from '$lib/types';
import { activeCategoryId } from './categories';

function normalize(b: Bookmark & { description?: string }): Bookmark {
  return {
    ...b,
    summary: b.summary ?? b.description ?? '',
    tags: b.tags ?? [],
    categoryId: b.categoryId || '4',
    createdAt: new Date(b.createdAt),
    reminderAt: b.reminderAt ? new Date(b.reminderAt) : undefined
  };
}
function createBookmarkStore() {
  const state = writable<Bookmark[]>([]);
  let remote = false;
  const persist = (next: Bookmark[]) => {
    if (!remote)
      localStorage.setItem('chikota-bookmarks', JSON.stringify(next));
    state.set(next);
  };
  async function request(path: string, method: string, body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!res.ok)
      throw new Error('Your changes could not be saved. Please try again.');
    return res.json();
  }
  return {
    subscribe: state.subscribe,
    init: async (signedIn = true) => {
      remote = signedIn;
      if (remote)
        state.set((await request('/api/bookmarks', 'GET')).map(normalize));
      else {
        const saved = localStorage.getItem('chikota-bookmarks');
        const parsed = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(parsed))
          throw new Error('The saved reading list could not be loaded.');
        state.set(parsed.map(normalize));
      }
    },
    addBookmark: async (bookmark: Bookmark) => {
      const saved = remote
        ? normalize(await request('/api/bookmarks', 'POST', bookmark))
        : bookmark;
      persist([saved, ...get(state)]);
      return saved;
    },
    updateBookmark: async (id: string, data: Partial<Bookmark>) => {
      if (remote)
        await request(`/api/bookmarks/${encodeURIComponent(id)}`, 'PUT', data);
      persist(get(state).map((b) => (b.id === id ? { ...b, ...data } : b)));
    },
    removeBookmark: async (id: string) => {
      if (remote)
        await request(`/api/bookmarks/${encodeURIComponent(id)}`, 'DELETE');
      persist(get(state).filter((b) => b.id !== id));
    },
    deleteBookmarks: async (ids: string[]) => {
      for (const id of ids) {
        if (remote)
          await request(`/api/bookmarks/${encodeURIComponent(id)}`, 'DELETE');
        persist(get(state).filter((b) => b.id !== id));
      }
    },
    cancelAllReminders: () =>
      persist(get(state).map((b) => ({ ...b, reminderAt: undefined }))),
    update: (fn: (bookmarks: Bookmark[]) => Bookmark[]) =>
      persist(fn(get(state)))
  };
}
export const bookmarks = createBookmarkStore();
export const filteredBookmarks = derived(
  [bookmarks, activeCategoryId],
  ([$bookmarks, $activeCategoryId]) =>
    $activeCategoryId === 'all'
      ? $bookmarks
      : $bookmarks.filter((b) => b.categoryId === $activeCategoryId)
);
export const bookmarkCounts = derived(bookmarks, (items) => {
  const counts: Record<string, number> = { all: items.length };
  for (const b of items) counts[b.categoryId] = (counts[b.categoryId] || 0) + 1;
  return counts;
});
