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
