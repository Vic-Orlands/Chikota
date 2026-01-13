export class ThemeStore {
    isDark = $state(false);
    isAnimating = $state(false);
    pendingTheme = $state<boolean | null>(null);

    init() {
        if (typeof window === 'undefined') return;

        const stored = localStorage.getItem("chikota-theme");
        if (stored) {
            this.isDark = stored === "dark";
        } else {
            this.isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        this.applyToDocument();
    }

    applyToDocument() {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle("dark", this.isDark);
            document.documentElement.style.colorScheme = this.isDark ? "dark" : "light";
        }
    }

    toggle() {
        if (this.isAnimating) return;

        const newTheme = !this.isDark;
        this.pendingTheme = newTheme;
        this.isAnimating = true;

        // Animation duration - needs to match CSS
        setTimeout(() => {
            this.isDark = newTheme;
            this.applyToDocument();
            localStorage.setItem("chikota-theme", this.isDark ? "dark" : "light");

            // Allow state to settle before removing animation layer
            setTimeout(() => {
                this.isAnimating = false;
                this.pendingTheme = null;
            }, 50);
        }, 800);
    }
}

export const themeStore = new ThemeStore();
