<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Badge } from "$lib/components/ui/badge";
    import { bookmarks } from "$lib/stores/bookmarks";
    import {
        activeCategoryId,
        categories,
        categoryColorClasses,
    } from "$lib/stores/categories";
    import Spinner from "$lib/components/Spinner.svelte";
    import { Plus, X, Link, Bookmark as BookmarkIcon } from "lucide-svelte";
    import { toast } from "svelte-sonner";
    import type { Tag, Bookmark } from "$lib/types";

    let {
        trigger = undefined,
        open = $bindable(false),
        mode = "add",
        bookmark = undefined,
    }: {
        trigger?: import("svelte").Snippet;
        open?: boolean;
        mode?: "add" | "edit";
        bookmark?: Bookmark;
    } = $props();

    let url = $state("");
    let isLoading = $state(false);
    let dataFetched = $state(false);

    // Form fields
    let title = $state("");
    let summary = $state("");
    let tags = $state<Tag[]>([]);
    let selectedCategoryId = $state("");
    let newTagInput = $state("");

    $effect(() => {
        if (open && mode === "edit" && bookmark) {
            url = bookmark.url;
            title = bookmark.title;
            summary = bookmark.summary || "";
            tags = [...bookmark.tags];
            selectedCategoryId = bookmark.categoryId;
            dataFetched = true;
        } else if (open && mode === "add" && !dataFetched) {
            // Keep reset state
        }
    });

    // Simulated URL metadata fetch (replace AI simulator)
    async function handleFetchMetadata() {
        if (!url) return;
        isLoading = true;

        try {
            // Simulate fetching metadata
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Extract domain for default title
            const urlObj = new URL(url);
            title = urlObj.hostname.replace("www.", "");
            summary = "";
            tags = [];
            selectedCategoryId = $activeCategoryId;
            dataFetched = true;
        } catch (error) {
            toast.error("Invalid URL format");
        } finally {
            isLoading = false;
        }
    }

    function handleSave() {
        if (!title || !url) return;

        if (mode === "edit" && bookmark) {
            bookmarks.updateBookmark(bookmark.id, {
                url,
                title,
                summary,
                tags,
                categoryId: selectedCategoryId || $activeCategoryId,
            });
            toast.success("Bookmark updated!");
        } else {
            bookmarks.addBookmark({
                id: crypto.randomUUID(),
                url,
                title,
                summary,
                tags,
                categoryId: selectedCategoryId || $activeCategoryId,
                createdAt: new Date(),
            });
            toast.success("Bookmark saved!");
        }

        open = false;
        if (mode === "add") reset();
    }

    function reset() {
        url = "";
        dataFetched = false;
        title = "";
        summary = "";
        tags = [];
        selectedCategoryId = "";
        isLoading = false;
        newTagInput = "";
    }

    function removeTag(id: string) {
        tags = tags.filter((t) => t.id !== id);
    }

    function addTag() {
        if (!newTagInput.trim()) return;
        tags = [...tags, { id: crypto.randomUUID(), name: newTagInput.trim() }];
        newTagInput = "";
    }

    function handleTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
    }
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && mode === "add" && reset()}>
    {#if trigger}
        <Dialog.Trigger>
            {@render trigger()}
        </Dialog.Trigger>
    {:else}
        <Dialog.Trigger>
            <Button
                size="sm"
                class="h-8 text-xs shadow-md shadow-primary/10 hover:shadow-primary/20 
                       transition-all duration-200 btn-click-effect gap-1.5"
            >
                <Plus class="h-3.5 w-3.5" />
                Add Bookmark
            </Button>
        </Dialog.Trigger>
    {/if}

    <Dialog.Content
        class="sm:max-w-[420px] border-border/50 bg-card/98 backdrop-blur-xl p-0 gap-0 overflow-hidden"
    >
        <Dialog.Header class="p-4 pb-3 border-b border-border/30">
            <Dialog.Title class="flex items-center gap-2 text-sm font-medium">
                <div
                    class="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"
                >
                    <BookmarkIcon class="h-3.5 w-3.5 text-primary" />
                </div>
                {mode === "edit" ? "Edit Bookmark" : "Add Bookmark"}
            </Dialog.Title>
            <Dialog.Description class="text-[11px] text-muted-foreground">
                Paste a URL to save and organize
            </Dialog.Description>
        </Dialog.Header>

        <div class="p-4 space-y-4">
            <!-- URL Input -->
            <div class="flex gap-2">
                <div class="relative flex-1">
                    <Link
                        class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                    />
                    <Input
                        placeholder="https://example.com..."
                        bind:value={url}
                        onkeydown={(e) =>
                            e.key === "Enter" && handleFetchMetadata()}
                        disabled={isLoading || dataFetched}
                        class="pl-8 h-8 text-xs"
                    />
                </div>
                {#if !dataFetched}
                    <Button
                        size="sm"
                        onclick={handleFetchMetadata}
                        disabled={isLoading || !url}
                        class="h-8 text-xs px-3 btn-click-effect"
                    >
                        {#if isLoading}
                            <Spinner size="xs" color="primary" />
                        {:else}
                            Fetch
                        {/if}
                    </Button>
                {:else}
                    <Button
                        variant="ghost"
                        size="sm"
                        onclick={reset}
                        class="h-8 text-xs px-3"
                    >
                        Clear
                    </Button>
                {/if}
            </div>

            <!-- Loading State -->
            {#if isLoading}
                <div
                    class="py-8 flex flex-col items-center justify-center space-y-3 text-center"
                >
                    <div class="relative">
                        <div
                            class="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"
                        ></div>
                        <Spinner size="md" color="primary" />
                    </div>
                    <p class="text-[11px] text-muted-foreground">
                        Fetching page info...
                    </p>
                </div>
            {/if}

            <!-- Form Fields -->
            {#if dataFetched && !isLoading}
                <div
                    class="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    <!-- Title -->
                    <div class="space-y-1.5">
                        <Label
                            for="title"
                            class="text-[11px] text-muted-foreground"
                            >Title</Label
                        >
                        <Input
                            id="title"
                            bind:value={title}
                            class="h-8 text-xs"
                        />
                    </div>

                    <!-- Summary -->
                    <div class="space-y-1.5">
                        <Label
                            for="summary"
                            class="text-[11px] text-muted-foreground"
                            >Description (optional)</Label
                        >
                        <textarea
                            id="summary"
                            class="flex min-h-[60px] w-full rounded-md border border-input bg-background
                                   px-2.5 py-2 text-xs ring-offset-background placeholder:text-muted-foreground
                                   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
                                   disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
                            placeholder="Add a brief description..."
                            bind:value={summary}
                        ></textarea>
                    </div>

                    <!-- Category -->
                    <div class="space-y-1.5">
                        <Label class="text-[11px] text-muted-foreground"
                            >Category</Label
                        >
                        <div class="flex flex-wrap gap-1.5">
                            {#each $categories as cat}
                                {@const colorClass =
                                    categoryColorClasses[cat.color]}
                                {@const isSelected =
                                    (selectedCategoryId ||
                                        $activeCategoryId) === cat.id}
                                <button
                                    type="button"
                                    onclick={() =>
                                        (selectedCategoryId = cat.id)}
                                    class="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200
                                           btn-click-effect border {isSelected
                                        ? `${colorClass.bg} ${colorClass.text} ${colorClass.border}`
                                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'}"
                                >
                                    {cat.name}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <!-- Tags -->
                    <div class="space-y-1.5">
                        <Label class="text-[11px] text-muted-foreground"
                            >Tags</Label
                        >
                        <div class="flex flex-wrap gap-1.5">
                            {#each tags as tag}
                                <Badge
                                    variant="secondary"
                                    class="pl-2 pr-1 py-0.5 gap-1 text-[10px] group hover:bg-destructive/10 
                                           hover:text-destructive cursor-pointer transition-colors btn-click-effect"
                                    onclick={() => removeTag(tag.id)}
                                >
                                    {tag.name}
                                    <X
                                        class="h-2.5 w-2.5 opacity-50 group-hover:opacity-100"
                                    />
                                </Badge>
                            {/each}
                            <div class="flex items-center gap-1">
                                <Input
                                    placeholder="Add tag..."
                                    bind:value={newTagInput}
                                    onkeydown={handleTagKeydown}
                                    class="h-6 w-20 text-[10px] px-2 border-dashed"
                                />
                                {#if newTagInput}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-6 w-6"
                                        onclick={addTag}
                                    >
                                        <Plus class="h-3 w-3" />
                                    </Button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        {#if dataFetched && !isLoading}
            <div class="p-4 pt-0">
                <Button
                    class="w-full h-8 text-xs btn-click-effect"
                    onclick={handleSave}
                    disabled={!title || !url}
                >
                    Save {mode === "edit" ? "Changes" : "Bookmark"}
                </Button>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>
