<script lang="ts">
    import { Sun, Moon } from "lucide-svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
</script>

<button
    onclick={() => themeStore.toggle()}
    disabled={themeStore.isAnimating}
    class="relative p-2 rounded-lg transition-all duration-300 ease-out
           hover:bg-secondary active:scale-95 focus-ring
           group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label="Toggle theme"
>
    <div class="relative w-4 h-4">
        <!-- Sun icon -->
        <div
            class="absolute inset-0 transition-all duration-300 ease-out
                    {themeStore.isDark
                ? 'opacity-0 scale-50 rotate-90'
                : 'opacity-100 scale-100 rotate-0'}"
        >
            <Sun class="w-4 h-4 text-amber-500" />
        </div>

        <!-- Moon icon -->
        <div
            class="absolute inset-0 transition-all duration-300 ease-out
                    {themeStore.isDark
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 scale-50 -rotate-90'}"
        >
            <Moon class="w-4 h-4 text-violet-400" />
        </div>
    </div>

    <!-- Hover glow effect -->
    <div
        class="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300
                {themeStore.isDark ? 'bg-violet-500/10' : 'bg-amber-500/10'}"
    ></div>
</button>
