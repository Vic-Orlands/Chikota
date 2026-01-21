import { writable } from 'svelte/store';
import type { Tag } from '$lib/types';

const initialTags: Tag[] = [];

function createTagStore() {
    const { subscribe, set, update } = writable<Tag[]>(initialTags);

    return {
        subscribe,
        init: async () => {
            try {
                const res = await fetch("/api/tags");
                if (res.ok) {
                    const data = await res.json();
                    set(data);
                }
            } catch (err) {
                console.error("Failed to fetch tags:", err);
            }
        },
        addTag: async (tag: Partial<Tag>) => {
            // Optimistic update handled by caller or refresh? 
            // Best to wait for server ID for robustness, or use temp ID.
            // For settings page, usually we want to create immediately.
            try {
                const res = await fetch("/api/tags", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(tag),
                });
                if (res.ok) {
                    const newTag = await res.json();
                    update(n => [newTag, ...n]);
                    return newTag;
                }
            } catch (err) {
                console.error(err);
            }
        },
        updateTag: async (id: string, data: Partial<Tag>) => {
            update(n => n.map(t => t.id === id ? { ...t, ...data } : t));
            try {
                const res = await fetch(`/api/tags/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error("Failed to update tag");
            } catch (err) {
                console.error(err);
                // revert?
            }
        },
        deleteTag: async (id: string) => {
            const oldState = await new Promise<Tag[]>(resolve => subscribe(resolve)());
            update(n => n.filter(t => t.id !== id));
            try {
                const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to delete tag");
            } catch (err) {
                console.error(err);
                set(oldState);
            }
        },
        deleteTags: async (ids: string[]) => {
            const oldState = await new Promise<Tag[]>(resolve => subscribe(resolve)());
            update(n => n.filter(t => !ids.includes(t.id)));
            try {
                // Parallel delete or bulk endpoint?
                // For now parallel delete as we didn't implement bulk delete endpoint yet
                // Or we can add bulk delete support to API.
                // Let's loop for now or use Promise.all
                await Promise.all(ids.map(id => fetch(`/api/tags/${id}`, { method: "DELETE" })));
            } catch (err) {
                console.error(err);
                set(oldState);
            }
        }
    };
}

export const tags = createTagStore();
