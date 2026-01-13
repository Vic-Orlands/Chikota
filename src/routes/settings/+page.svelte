<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import {
        Moon,
        Sun,
        Monitor,
        Palette,
        Info,
        ArrowLeft,
    } from "lucide-svelte";
    import { onMount } from "svelte";

    let currentTheme = $state<"light" | "dark" | "system">("system");

    onMount(() => {
        const stored = localStorage.getItem("chikota-theme");
        if (stored === "dark" || stored === "light") {
            currentTheme = stored;
        }
    });

    function setTheme(theme: "light" | "dark" | "system") {
        currentTheme = theme;

        if (theme === "system") {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches;
            if (prefersDark) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            localStorage.removeItem("chikota-theme");
        } else if (theme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("chikota-theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("chikota-theme", "light");
        }
    }

    const themeOptions = [
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
    ] as const;
</script>

<div class="space-y-6">
    <!-- Page Header -->
    <header class="space-y-2">
        <div class="flex items-center gap-3">
            <a
                href="/"
                class="inline-flex items-center justify-center h-8 w-8 rounded-lg
                       hover:bg-secondary text-muted-foreground hover:text-foreground
                       transition-colors btn-click-effect"
            >
                <ArrowLeft class="h-4 w-4" />
            </a>
            <div>
                <h1 class="text-xl font-semibold tracking-tight">Settings</h1>
                <p class="text-xs text-muted-foreground">
                    Customize your experience
                </p>
            </div>
        </div>
    </header>

    <!-- Settings Content -->
    <div class="max-w-md space-y-6">
        <!-- Appearance Section -->
        <section class="space-y-3">
            <div
                class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
                <Palette class="h-3 w-3" />
                Appearance
            </div>

            <div
                class="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4"
            >
                <Label class="text-xs text-muted-foreground mb-3 block"
                    >Theme</Label
                >
                <div class="grid grid-cols-3 gap-2">
                    {#each themeOptions as option}
                        {@const isActive = currentTheme === option.value}
                        {@const Icon = option.icon}
                        <button
                            onclick={() => setTheme(option.value)}
                            class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 btn-click-effect
                               {isActive
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border/50 hover:border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}"
                        >
                            <Icon class="h-4 w-4" />
                            <span class="text-[10px] font-medium"
                                >{option.label}</span
                            >
                        </button>
                    {/each}
                </div>
            </div>
        </section>

        <!-- About Section -->
        <section class="space-y-3">
            <div
                class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
                <Info class="h-3 w-3" />
                About
            </div>

            <div
                class="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2"
            >
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">Chikọta</span>
                    <span class="text-[10px] text-muted-foreground">v1.0.0</span
                    >
                </div>
                <p class="text-[10px] text-muted-foreground leading-relaxed">
                    "Chikọta" is an Igbo word meaning "bring together" — a
                    simple, beautiful way to organize your bookmarks.
                </p>
            </div>
        </section>
    </div>
</div>
