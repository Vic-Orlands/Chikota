<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import {
        Settings,
        Moon,
        Sun,
        Monitor,
        Palette,
        Info,
        ExternalLink,
        Bell,
        BellOff,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import { bookmarks } from "$lib/stores/bookmarks";

    let open = $state(false);
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

    function cancelAllReminders() {
        (bookmarks as any).cancelAllReminders();
    }

    const themeOptions = [
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
    ] as const;
</script>

<Dialog.Root bind:open>
    <Dialog.Trigger>
        {#snippet child({ props })}
            <Button
                variant="ghost"
                size="icon"
                class="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors btn-click-effect"
                {...props}
            >
                <Settings class="h-4 w-4" />
            </Button>
        {/snippet}
    </Dialog.Trigger>

    <Dialog.Content
        class="sm:max-w-[380px] border-border/50 bg-card/98 backdrop-blur-xl p-0 gap-0 overflow-hidden"
    >
        <Dialog.Header class="p-4 pb-3 border-b border-border/30">
            <Dialog.Title class="flex items-center gap-2 text-sm font-medium">
                <div
                    class="w-6 h-6 rounded-md bg-secondary flex items-center justify-center"
                >
                    <Settings class="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Settings
            </Dialog.Title>
        </Dialog.Header>

        <div class="p-4 space-y-5">
            <!-- Appearance -->
            <div class="space-y-2.5">
                <div
                    class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                >
                    <Palette class="h-3 w-3" />
                    Appearance
                </div>

                <div class="grid grid-cols-3 gap-2">
                    {#each themeOptions as option}
                        {@const isActive = currentTheme === option.value}
                        {@const Icon = option.icon}
                        <button
                            onclick={() => setTheme(option.value)}
                            class="cursor-pointer flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 hover:scale-105 btn-click-effect
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

             <!-- Reminders -->
             <div class="space-y-2.5">
                 <div
                     class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                 >
                     <Bell class="h-3 w-3" />
                     Reminders
                 </div>

                 <Button
                     variant="outline"
                     size="sm"
                     class="w-full h-8 text-xs btn-click-effect"
                     onclick={cancelAllReminders}
                 >
                     <BellOff class="h-3 w-3 mr-2" />
                     Cancel All Reminders
                 </Button>
             </div>

             <!-- About -->
            <div class="space-y-2.5">
                <div
                    class="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                    <Info class="h-3 w-3" />
                    About
                </div>

                <div class="rounded-lg bg-secondary/30 p-3 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-medium">Chikọta</span>
                        <span class="text-xs text-muted-foreground">v1.0.0</span
                        >
                    </div>
                    <p class="text-xs text-muted-foreground leading-relaxed">
                        "Chikọta" is an Igbo word meaning "bring together" — a
                        simple, beautiful way to organize your bookmarks.
                    </p>
                </div>
            </div>
        </div>

        <div class="p-4 pt-0">
            <Button
                variant="outline"
                size="sm"
                class="w-full h-8 text-xs btn-click-effect"
                onclick={() => (open = false)}
            >
                Done
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
