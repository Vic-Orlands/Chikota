<script>
    import { Button } from "$lib/components/ui/button";
    import Logo from "$lib/components/Logo.svelte";
    import { authClient } from "$lib/auth-client";
    import { ArrowRight, Sparkles } from "lucide-svelte";
    import { cn } from "$lib/utils";
    import DefaultFavicon from "$lib/components/icons/DefaultFavicon.svelte";
</script>

<div
    class="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden"
>
    <div class="relative z-10 max-w-4xl w-full text-center space-y-12">
        <div class="space-y-6">
            <h1
                class="text-4xl sm:text-6xl font-bold tracking-tight text-foreground"
            >
                Your Bookmarks, <br />
                <span class="text-primary"> Intelligently Organized. </span>
            </h1>
            <p
                class="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
                Stop losing links in browser folders. Experience a modern,
                beautiful way to save specifically designed for developers and
                designers.
            </p>

            <div
                class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
                <Button
                    size="lg"
                    class="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    onclick={() =>
                        authClient.signIn.social({ provider: "google" })}
                >
                    <svg
                        class="h-5 w-5"
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
                    Sign in with Google
                </Button>
            </div>
        </div>

        <div
            class="grid grid-cols-1 sm:grid-cols-2 mt-16 gap-4 sm:gap-6 text-left"
        >
            <div
                class="p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm hover:bg-secondary/50 transition-colors"
            >
                <h3 class="font-semibold text-lg mb-2">Smart Categorization</h3>
                <p class="text-sm text-muted-foreground">
                    Automatically sorts your links into Development, Design, AI,
                    and more.
                </p>
            </div>

            <div
                class="p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm hover:bg-secondary/50 transition-colors"
            >
                <h3 class="font-semibold text-lg mb-2">Smart Reminders</h3>
                <p class="text-sm text-muted-foreground">
                    Set "read later" reminders and never forget an article
                    again.
                </p>
            </div>

            <div
                class="p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm hover:bg-secondary/50 transition-colors"
            >
                <h3 class="font-semibold text-lg mb-2">Beautiful Interface</h3>
                <p class="text-sm text-muted-foreground">
                    A clean, dark-mode first design that feels right at home.
                </p>
            </div>
            <div
                class="p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm hover:bg-secondary/50 transition-colors"
            >
                <h3 class="font-semibold text-lg mb-2">Visual Cards</h3>
                <p class="text-sm text-muted-foreground">
                    Rich previews with persistent favicons and summaries.
                </p>
            </div>
        </div>
    </div>
</div>
