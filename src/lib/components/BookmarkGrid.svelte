<script lang="ts">
    import type { Bookmark } from "$lib/types";
    import BookmarkCard from "./BookmarkCard.svelte";
    import Spinner from "./Spinner.svelte";

    let {
        bookmarks,
        viewMode = "grid",
    }: { bookmarks: Bookmark[]; viewMode?: "grid" | "list" } = $props();

    // Infinite scroll settings
    const BATCH_SIZE = 12;
    let visibleCount = $state(BATCH_SIZE);
    let isLoadingMore = $state(false);
    let containerRef: HTMLDivElement;

    // Reset visible count when bookmarks change
    $effect(() => {
        bookmarks; // dependency
        visibleCount = BATCH_SIZE;
    });

    let visibleBookmarks = $derived(bookmarks.slice(0, visibleCount));
    let hasMore = $derived(visibleCount < bookmarks.length);

    function loadMore() {
        if (isLoadingMore || !hasMore) return;
        isLoadingMore = true;

        // Simulate small delay for smooth loading
        setTimeout(() => {
            visibleCount = Math.min(
                visibleCount + BATCH_SIZE,
                bookmarks.length,
            );
            isLoadingMore = false;
        }, 200);
    }

    // Intersection Observer for infinite scroll
    let sentinelRef = $state<HTMLDivElement>();

    $effect(() => {
        if (!sentinelRef) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { rootMargin: "100px" },
        );

        observer.observe(sentinelRef);

        return () => observer.disconnect();
    });
</script>

<div bind:this={containerRef}>
    <div
        class="stagger-children {viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-2'}"
    >
        {#each visibleBookmarks as bookmark (bookmark.id)}
            <BookmarkCard {bookmark} {viewMode} />
        {/each}
    </div>

    <!-- Loading sentinel / infinite scroll trigger -->
    {#if hasMore}
        <div
            bind:this={sentinelRef}
            class="flex items-center justify-center py-8"
        >
            {#if isLoadingMore}
                <div class="flex items-center gap-2 text-muted-foreground">
                    <Spinner size="sm" color="muted" />
                    <span class="text-xs">Loading more...</span>
                </div>
            {/if}
        </div>
    {/if}

    <!-- End of list indicator -->
    {#if !hasMore && bookmarks.length > BATCH_SIZE}
        <div
            class="flex items-center justify-center py-6 text-xs text-muted-foreground"
        >
            <span>You've reached the end</span>
        </div>
    {/if}
</div>
