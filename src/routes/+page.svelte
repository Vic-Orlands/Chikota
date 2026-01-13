<script lang="ts">
    import { filteredBookmarks } from "$lib/stores/bookmarks";
    import { activeCategoryId, categories } from "$lib/stores/categories";
    import BookmarkGrid from "$lib/components/BookmarkGrid.svelte";
    import AddBookmarkDialog from "$lib/components/AddBookmarkDialog.svelte";
    import CategoryTabs from "$lib/components/CategoryTabs.svelte";
    import LandingPage from "$lib/components/LandingPage.svelte"; // Import LandingPage
    import { Input } from "$lib/components/ui/input";
    import { Search, Filter, LayoutGrid, List } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { authClient } from "$lib/auth-client"; // Import authClient

    let currentCategory = $derived(
        $categories.find((c) => c.id === $activeCategoryId),
    );

    let searchQuery = $state("");
    let viewMode: "grid" | "list" = $state("grid");

    // Auth Session State
    let session = $state(authClient.useSession());

    let displayedBookmarks = $derived(
        searchQuery
            ? $filteredBookmarks.filter(
                  (b) =>
                      b.title
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                      b.summary
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                      b.tags.some((t) =>
                          t.text
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                      ),
              )
            : $filteredBookmarks,
    );
</script>

{#if !$session.data}
    <LandingPage />
{:else}
    <div class="space-y-6">
        <!-- Page Header -->
        <header class="space-y-4">
            <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
                <div>
                    <h1
                        class="text-xl sm:text-2xl font-semibold tracking-tight"
                    >
                        Your Bookmarks
                    </h1>
                    <p class="text-xs text-muted-foreground mt-0.5">
                        Organize and access your saved links
                    </p>
                </div>
                <AddBookmarkDialog />
            </div>

            <!-- Category Tabs -->
            <CategoryTabs />
        </header>

        <!-- Search & Controls Bar -->
        <div class="flex items-center gap-3">
            <div class="relative flex-1 group">
                <Search
                    class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground 
                          group-focus-within:text-primary transition-colors duration-200"
                />
                <Input
                    type="search"
                    placeholder="Search bookmarks..."
                    bind:value={searchQuery}
                    class="pl-9 h-10 text-sm bg-secondary/40 border-transparent 
                       focus:bg-background focus:border-border 
                       transition-all duration-200 focus:ring-1 focus:ring-primary/20 rounded-lg"
                />
            </div>

            <div class="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-10 w-10 {viewMode === 'grid'
                        ? 'bg-secondary'
                        : ''} btn-click-effect rounded-lg"
                    onclick={() => (viewMode = "grid")}
                >
                    <LayoutGrid class="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-10 w-10 {viewMode === 'list'
                        ? 'bg-secondary'
                        : ''} btn-click-effect rounded-lg"
                    onclick={() => (viewMode = "list")}
                >
                    <List class="h-4 w-4" />
                </Button>
            </div>
        </div>

        <!-- Bookmarks Display -->
        {#if displayedBookmarks.length > 0}
            <BookmarkGrid bookmarks={displayedBookmarks} {viewMode} />
        {:else}
            <!-- Empty State -->
            <div
                class="flex flex-col items-center justify-center py-16 text-center"
            >
                <div
                    class="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4"
                >
                    <Search class="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 class="text-sm font-medium mb-1">
                    {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
                </h3>
                <p class="text-xs text-muted-foreground max-w-xs">
                    {searchQuery
                        ? "Try adjusting your search query or browse a different category."
                        : "Add your first bookmark to start organizing your links."}
                </p>
            </div>
        {/if}
    </div>
{/if}
