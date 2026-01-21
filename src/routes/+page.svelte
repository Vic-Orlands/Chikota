<script lang="ts">
    import { filteredBookmarks } from "$lib/stores/bookmarks";
    import type { Bookmark } from "$lib/types";
    import { activeCategoryId, categories } from "$lib/stores/categories";
    import BookmarkGrid from "$lib/components/BookmarkGrid.svelte";
    import AddBookmarkDialog from "$lib/components/AddBookmarkDialog.svelte";
    import CategoryTabs from "$lib/components/CategoryTabs.svelte";
    import LandingPage from "$lib/components/LandingPage.svelte";
    import { Input } from "$lib/components/ui/input";
    import {
        Search,
        Filter,
        LayoutGrid,
        List,
        CheckSquare,
        Trash2,
    } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";

    let currentCategory = $derived(
        $categories.find((c) => c.id === $activeCategoryId),
    );

    let searchQuery = $state("");
    let viewMode: "grid" | "list" = $state("grid");

    let { data } = $props();
    // Use session from server load to prevent flicker
    let session = $derived(data.session);

    let editingBookmark = $state<Bookmark | undefined>(undefined);
    let isEditDialogOpen = $state(false);

    // Bulk Selection State
    let isSelectionMode = $state(false);
    let selectedIds = $state<Set<string>>(new Set());

    function handleEdit(bookmark: Bookmark) {
        editingBookmark = bookmark;
        isEditDialogOpen = true;
    }

    function toggleSelectionMode() {
        isSelectionMode = !isSelectionMode;
        selectedIds = new Set();
    }

    function toggleSelect(id: string) {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        selectedIds = newSet;
    }

    async function handleBulkDelete() {
        if (selectedIds.size === 0) return;
        if (
            !confirm(
                `Are you sure you want to delete ${selectedIds.size} bookmarks?`,
            )
        )
            return;

        await bookmarks.deleteBookmarks(Array.from(selectedIds));
        isSelectionMode = false;
        selectedIds = new Set();
    }

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
                          t.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                      ),
              )
            : $filteredBookmarks,
    );
</script>

{#if !session}
    <LandingPage />
{:else}
    <div class="space-y-6">
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
                <AddBookmarkDialog
                    bind:open={isEditDialogOpen}
                    mode="edit"
                    bookmark={editingBookmark}
                />
            </div>

            <CategoryTabs />
        </header>

        <!-- Bulk Actions Bar -->
        {#if isSelectionMode}
            <div
                class="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-2"
            >
                <span class="text-sm font-medium">
                    {selectedIds.size} selected
                </span>
                <div class="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => (isSelectionMode = false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        class="gap-2"
                        disabled={selectedIds.size === 0}
                        onclick={handleBulkDelete}
                    >
                        <Trash2 class="h-4 w-4" />
                        Delete Selected
                    </Button>
                </div>
            </div>
        {/if}

        <div class="flex items-center gap-3">
            <Button
                variant={isSelectionMode ? "secondary" : "ghost"}
                size="sm"
                class="h-10 text-xs gap-2"
                onclick={toggleSelectionMode}
            >
                <CheckSquare class="h-4 w-4" />
                {isSelectionMode ? "Done" : "Select"}
            </Button>
            <div class="h-6 w-px bg-border"></div>

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

        {#if displayedBookmarks.length > 0}
            <BookmarkGrid
                bookmarks={displayedBookmarks}
                {viewMode}
                onEdit={handleEdit}
                {isSelectionMode}
                {selectedIds}
                onSelect={toggleSelect}
            />
        {:else}
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
