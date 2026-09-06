import { writable } from 'svelte/store';
import type { Category } from '$lib/types';

const defaultCategories: Category[] = [
  { id: 'all', name: 'All', color: 'emerald', icon: 'Globe' }
];

const allCategory: Category = {
  id: 'all',
  name: 'All',
  color: 'emerald',
  icon: 'Globe'
};

// Helper function to create a store that syncs with localStorage
function createPersistedStore<T>(key: string, initialValue: T) {
  const stored =
    typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  let initial = stored ? JSON.parse(stored) : initialValue;

  if (
    key === 'categories' &&
    Array.isArray(initial) &&
    typeof window !== 'undefined' &&
    !localStorage.getItem('chikota-empty-collections-v1')
  ) {
    const legacyDefaults = new Set(['1', '2', '3', '4']);
    initial = initial.filter(
      (category: Category) => !legacyDefaults.has(category.id)
    );
    localStorage.setItem('chikota-empty-collections-v1', 'true');
  }

  // Ensure "All" category always exists for categories store
  if (key === 'categories' && Array.isArray(initial)) {
    const hasAllCategory = initial.some((c: Category) => c.id === 'all');
    if (!hasAllCategory) {
      initial = [allCategory, ...initial];
    }
  }

  const store = writable<T>(initial);

  if (typeof window !== 'undefined') {
    store.subscribe((value) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  return store;
}

export const categories = createPersistedStore<Category[]>(
  'categories',
  defaultCategories
);
export const activeCategoryId = createPersistedStore<string>(
  'activeCategoryId',
  'all'
);

export function addCategory(category: Omit<Category, 'id'>) {
  categories.update((cats) => [
    ...cats,
    { ...category, id: Date.now().toString() }
  ]);
}

export function deleteCategory(id: string) {
  if (id === 'all') return;
  categories.update((cats) => cats.filter((c) => c.id !== id));
}

export function renameCategory(id: string, name: string) {
  if (id === 'all') return;
  categories.update((cats) =>
    cats.map((category) =>
      category.id === id ? { ...category, name } : category
    )
  );
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
export const categoryColorClasses: Record<
  Category['color'],
  { bg: string; text: string; border: string }
> = {
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30'
  },
  violet: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30'
  },
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30'
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30'
  },
  sky: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30'
  }
};
