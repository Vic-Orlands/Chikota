<script lang="ts">
    import "./layout.css";
    import Logo from "$lib/components/Logo.svelte";
    import ThemeToggle from "$lib/components/ThemeToggle.svelte";
    import SettingsModal from "$lib/components/SettingsModal.svelte";
    import RemindersModal from "$lib/components/RemindersModal.svelte";
    import { Toaster } from "$lib/components/ui/sonner";
    import { page } from "$app/stores";
    import { authClient } from "$lib/auth-client";
    import { LogIn, LogOut, User as UserIcon } from "lucide-svelte";
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

<!-- Reusable App Shell Snippet -->
{#snippet appShell(isDark: boolean)}
    <div
        class="min-h-screen w-full bg-background text-foreground font-sans antialiased selection:bg-primary/20 {isDark
            ? 'dark'
            : ''}"
        style="color-scheme: {isDark ? 'dark' : 'light'}"
    >
        <!-- Grid Background Pattern -->
        <div
            class="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-[0.6] dark:opacity-[0.3]"
        ></div>

        <!-- Sticky Header -->
        <header
            class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm transition-colors duration-0"
        >
            <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex h-14 items-center justify-between gap-4">
                    <!-- Logo -->
                    <div class="flex items-center gap-3">
                        <Logo size="md" />
                    </div>

                    <!-- Right Actions -->
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
                                <img
                                    src="https://authjs.dev/img/providers/google.svg"
                                    alt="Google"
                                    class="h-3.5 w-3.5"
                                />
                                <span class="hidden sm:inline">Sign in</span>
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {@render children()}
        </main>

        <Toaster />
    </div>
{/snippet}

<div class="relative min-h-screen overflow-hidden">
    <!-- Current Theme Layer (Base) -->
    <div class="absolute inset-0">
        {@render appShell(themeStore.isDark)}
    </div>

    <!-- animating Reveal Layer (Overlay) -->
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
