import { writable } from 'svelte/store';
import type { Category, Bookmark } from '$lib/types';
import { bookmarks } from './bookmarks';

const defaultCategories: Category[] = [
    { id: 'all', name: 'All', color: 'emerald', icon: 'Globe' },
    { id: '1', name: 'Personal', color: 'violet', icon: 'User' },
    { id: '2', name: 'Work', color: 'sky', icon: 'Briefcase' },
    { id: '3', name: 'Inspiration', color: 'rose', icon: 'Sparkles' },
    { id: '4', name: 'Reading List', color: 'amber', icon: 'BookOpen' }
];

// Helper function to create a store that syncs with localStorage
function createPersistedStore<T>(key: string, initialValue: T) {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    const initial = stored ? JSON.parse(stored) : initialValue;

    const store = writable<T>(initial);

    if (typeof window !== 'undefined') {
        store.subscribe(value => {
            localStorage.setItem(key, JSON.stringify(value));
        });
    }

    return store;
}

export const categories = createPersistedStore<Category[]>('categories', defaultCategories);
export const activeCategoryId = createPersistedStore<string>('activeCategoryId', 'all');

export function addCategory(category: Omit<Category, 'id'>) {
    categories.update(cats => [
        ...cats,
        { ...category, id: Date.now().toString() }
    ]);
}

export function deleteCategory(id: string) {
    if (id === 'all') return; // Cannot delete "All"
    categories.update(cats => cats.filter(c => c.id !== id));
}

// Color mapping for CSS variables
export const categoryColors: Record<Category['color'], string> = {
    emerald: 'var(--category-emerald)',
    violet: 'var(--category-violet)',
    amber: 'var(--category-amber)',
    rose: 'var(--category-rose)',
    sky: 'var(--category-sky)'
};

// Tailwind color classes for badges/indicators
export const categoryColorClasses: Record<Category['color'], { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
    sky: { bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' }
};
