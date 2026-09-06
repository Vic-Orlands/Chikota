export type Theme = 'light' | 'forest' | 'ember';
export class ThemeStore {
  current = $state<Theme>('light');
  isDark = $derived(this.current !== 'light');
  isAnimating = false;
  pendingTheme = null;
  init() {
    try {
      const saved = localStorage.getItem('chikota-theme');
      this.current =
        saved === 'forest' || saved === 'ember'
          ? saved
          : saved === 'dark'
            ? 'forest'
            : 'light';
    } catch {
      this.current = 'light';
    }
    this.applyToDocument();
  }
  applyToDocument() {
    document.documentElement.dataset.theme = this.current;
    document.documentElement.classList.toggle('dark', this.isDark);
    document.documentElement.style.colorScheme = this.isDark ? 'dark' : 'light';
  }
  set(theme: Theme) {
    this.current = theme;
    this.applyToDocument();
    try {
      localStorage.setItem('chikota-theme', theme);
    } catch {
      /* The selected theme still works when storage is unavailable. */
    }
  }
  toggle() {
    this.set(
      this.current === 'light'
        ? 'forest'
        : this.current === 'forest'
          ? 'ember'
          : 'light'
    );
  }
}
export const themeStore = new ThemeStore();
