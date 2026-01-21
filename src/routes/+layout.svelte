<script lang="ts">
    import "./layout.css";
    import Logo from "$lib/components/Logo.svelte";
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import SettingsModal from "$lib/components/SettingsModal.svelte";
    import RemindersModal from "$lib/components/RemindersModal.svelte";
    import { Toaster } from "$lib/components/ui/sonner";
    import { authClient } from "$lib/auth-client";
    import { LogOut, User as UserIcon } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";

    import { onMount } from "svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { bookmarks } from "$lib/stores/bookmarks";

    let { children } = $props();

    let session = $state(authClient.useSession());

    onMount(() => {
        themeStore.init();
        if ($session.data) {
            bookmarks.init();
        }
    });
</script>

<svelte:head>
    <link rel="icon" href="/favicon.svg" />
</svelte:head>

{#snippet appShell(isDark: boolean)}
    <div
        class="relative min-h-screen w-full bg-background text-foreground font-sans antialiased selection:bg-primary/20 {isDark
            ? 'dark'
            : 'light'}"
        style="color-scheme: {isDark ? 'dark' : 'light'}"
    >
        <!-- Grid Background Pattern -->
        <div class="pointer-events-none absolute inset-0 grid-bg"></div>

        <header
            class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm transition-colors duration-0"
        >
            <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex h-14 items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <Logo size="md" />
                    </div>

                    <div class="flex items-center gap-2">
                        <RemindersModal />
                        <ThemeToggle />
                        <SettingsModal />

                        <div class="h-4 w-px bg-border mx-1"></div>

                        {#if $session.data}
                            <div class="flex items-center gap-2">
                                {#if $session.data.user.image}
                                    <img
                                        src={$session.data.user.image}
                                        alt="User"
                                        class="h-7 w-7 rounded-full border border-border/50"
                                    />
                                {:else}
                                    <div
                                        class="h-7 w-7 rounded-full bg-secondary flex items-center justify-center border border-border/50"
                                    >
                                        <UserIcon
                                            class="h-4 w-4 text-muted-foreground"
                                        />
                                    </div>
                                {/if}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="h-8 text-xs gap-2"
                                    onclick={() => authClient.signOut()}
                                >
                                    <LogOut class="h-3.5 w-3.5" />
                                    <span class="hidden sm:inline"
                                        >Sign out</span
                                    >
                                </Button>
                            </div>
                        {:else}
                            <Button
                                variant="default"
                                size="sm"
                                class="h-8 text-xs gap-2 shadow-sm"
                                onclick={() =>
                                    authClient.signIn.social({
                                        provider: "google",
                                    })}
                            >
                                <svg
                                    class="h-3.5 w-3.5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span class="hidden sm:inline">Sign in</span>
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>
        </header>

        <main class="relative z-10 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {@render children()}
        </main>

        <Toaster />
    </div>
{/snippet}

<div class="relative min-h-screen overflow-hidden">
    <div class="absolute inset-0">
        {@render appShell(themeStore.isDark)}
    </div>

    {#if themeStore.isAnimating && themeStore.pendingTheme !== null}
        <div
            class="absolute inset-0 z-[100]"
            style="animation: {themeStore.pendingTheme
                ? 'revealDown'
                : 'revealUp'} 0.8s ease-in-out forwards;"
        >
            {@render appShell(themeStore.pendingTheme)}
        </div>
    {/if}
</div>
