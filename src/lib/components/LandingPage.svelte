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
                    <img
                        src="https://authjs.dev/img/providers/google.svg"
                        alt="Google"
                        class="h-5 w-5 mr-3"
                    />
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
