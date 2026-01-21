import { writable, derived } from 'svelte/store';
import type { Bookmark } from '$lib/types';
import { activeCategoryId } from './categories';

const initialBookmarks: Bookmark[] = [];

function createBookmarkStore() {
    const { subscribe, set, update } = writable<Bookmark[]>(initialBookmarks);

    return {
        subscribe,
        init: async () => {
            try {
                const res = await fetch("/api/bookmarks");
                if (res.ok) {
                    const data = await res.json();
                    set(data.map((b: any) => ({
                        ...b,
                        createdAt: new Date(b.createdAt),
                        updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
                        reminderAt: b.reminderAt ? new Date(b.reminderAt) : undefined,
                        reminderEmail: b.reminderEmail || undefined,
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch bookmarks:", err);
            }
        },
        addBookmark: async (bookmark: Bookmark) => {
            // Optimistic update
            update(n => [bookmark, ...n]);
            try {
                const res = await fetch("/api/bookmarks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bookmark),
                });
                if (!res.ok) throw new Error("Failed to save");
            } catch (err) {
                console.error(err);
                // Revert or show error
            }
        },
        removeBookmark: async (id: string) => {
            const oldState = await new Promise<Bookmark[]>(resolve => subscribe(resolve)());
            update(n => n.filter(b => b.id !== id));
            try {
                const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete");
            } catch (err) {
                console.error(err);
                set(oldState); // Revert
            }
        },
        deleteBookmarks: async (ids: string[]) => {
            const oldState = await new Promise<Bookmark[]>(resolve => subscribe(resolve)());
            update(n => n.filter(b => !ids.includes(b.id)));
            try {
                const res = await fetch(`/api/bookmarks?ids=${ids.join(',')}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete bookmarks");
            } catch (err) {
                console.error(err);
                set(oldState);
            }
        },
        updateBookmark: async (id: string, data: Partial<Bookmark>) => {
            update(n => n.map(b => b.id === id ? { ...b, ...data } : b));
            try {
                const res = await fetch(`/api/bookmarks/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error("Failed to update");
            } catch (err) {
                console.error(err);
            }
        },
        cancelAllReminders: () => update(n => n.map(b => ({ ...b, reminderAt: undefined }))),
        update: (fn: (bookmarks: Bookmark[]) => Bookmark[]) => update(fn)
    };
}

export const bookmarks = createBookmarkStore();

export const filteredBookmarks = derived(
    [bookmarks, activeCategoryId],
    ([$bookmarks, $activeCategoryId]) => $activeCategoryId === 'all' ? $bookmarks : $bookmarks.filter(b => b.categoryId === $activeCategoryId)
);

// Get bookmarks count per category
export const bookmarkCounts = derived(
    bookmarks,
    ($bookmarks) => {
        const counts: Record<string, number> = {};
        $bookmarks.forEach(b => {
            counts[b.categoryId] = (counts[b.categoryId] || 0) + 1;
        });
        return counts;
    }
);
