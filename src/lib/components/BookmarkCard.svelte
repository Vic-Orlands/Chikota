<script lang="ts">
    import type { Bookmark } from "$lib/types";
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import {
        ExternalLink,
        Trash2,
        Calendar,
        Clock,
        MoreHorizontal,
        Copy,
    } from "lucide-svelte";
    import { bookmarks } from "$lib/stores/bookmarks";
    import { categories, categoryColorClasses } from "$lib/stores/categories";
    import { format } from "date-fns";
    import { toast } from "svelte-sonner";
    import { cn } from "$lib/utils";
    import ReminderPicker from "$lib/components/ReminderPicker.svelte";
    import DefaultFavicon from "$lib/components/icons/DefaultFavicon.svelte";

    let {
        bookmark,
        viewMode = "grid",
    }: { bookmark: Bookmark; viewMode?: "grid" | "list" } = $props();

    let isDeleting = $state(false);
    let copyText = $state("Copy");
    let faviconError = $state(false);

    let category = $derived(
        $categories.find((c) => c.id === bookmark.categoryId),
    );
    let colorClass = $derived(
        category ? categoryColorClasses[category.color] : null,
    );

    function handleDelete() {
        isDeleting = true;
        setTimeout(() => {
            bookmarks.removeBookmark(bookmark.id);
            toast.success("Bookmark deleted");
        }, 150);
    }

    function handleCopy() {
        navigator.clipboard.writeText(bookmark.url);
        copyText = "Copied";
        setTimeout(() => (copyText = "Copy"), 2000);
    }
</script>

{#if viewMode === "grid"}
    <!-- Grid Card View -->
    <div
        class={cn(
            "bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full",
            isDeleting && "scale-95 opacity-50",
        )}
    >
        <div class="p-5 flex-1">
            <div class="flex flex-col items-center gap-3 mb-3">
                {#if !faviconError}
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`}
                        alt=""
                        class="w-8 h-8 rounded-sm flex-shrink-0"
                        draggable="false"
                        onerror={() => (faviconError = true)}
                    />
                {:else}
                    <DefaultFavicon class="w-8 h-8 rounded-sm flex-shrink-0" />
                {/if}
                <div class="flex-1 min-w-0 w-full">
                    <div class="flex items-start justify-between gap-2 mb-1">
                        <h3 class="font-semibold text-foreground truncate">
                            {bookmark.title}
                        </h3>
                        <span
                            class="text-xs text-muted-foreground whitespace-nowrap"
                        >
                            {format(
                                new Date(bookmark.createdAt),
                                "MMM d, yyyy",
                            )}
                        </span>
                    </div>
                    {#if bookmark.summary}
                        <p
                            class="text-sm text-muted-foreground line-clamp-2 mb-2"
                        >
                            {bookmark.summary}
                        </p>
                    {/if}
                    <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-primary hover:text-primary/80 flex items-center gap-1 w-fit"
                    >
                        {new URL(bookmark.url).hostname}
                        <ExternalLink class="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>

        <div
            class="border-t border-border px-5 py-3 bg-secondary/50 flex items-center gap-2 mt-auto"
        >
            <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-background rounded-lg transition-colors"
                onclick={handleCopy}
            >
                <Copy class="w-4 h-4" />
                <span>{copyText}</span>
            </button>

            <ReminderPicker
                existingDate={bookmark.reminderAt}
                existingEmail={bookmark.reminderEmail}
                bookmarkTitle={bookmark.title}
                bookmarkUrl={bookmark.url}
                onSave={(date: Date, email?: string) => {
                    bookmarks.updateBookmark(bookmark.id, {
                        reminderAt: date,
                        reminderEmail: email,
                    });
                    toast.success(
                        "Reminder set for " + format(date, "MMM d, h:mm a"),
                    );
                }}
            >
                {#snippet trigger({
                    props,
                }: {
                    props: Record<string, unknown>;
                })}
                    <button
                        class={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-background rounded-lg transition-colors relative",
                            bookmark.reminderAt &&
                                new Date(bookmark.reminderAt) > new Date() &&
                                "text-primary bg-primary/10 hover:bg-primary/20",
                        )}
                        {...props}
                    >
                        <Clock class="w-4 h-4" />
                        {#if bookmark.reminderAt && new Date(bookmark.reminderAt) > new Date()}
                            <span class="font-medium">
                                {format(
                                    new Date(bookmark.reminderAt),
                                    "MMM d, h:mm a",
                                )}
                            </span>
                            <span
                                class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse ring-2 ring-background"
                            ></span>
                        {:else}
                            <span>Remind</span>
                        {/if}
                    </button>
                {/snippet}
            </ReminderPicker>

            <div class="flex-1"></div>

            <button
                class="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                onclick={handleDelete}
            >
                <Trash2 class="w-4 h-4" />
                <span>Delete</span>
            </button>
        </div>
    </div>
{:else}
    <div
        class={cn(
            "group flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200",
            "hover:bg-secondary/50 border border-transparent hover:border-border/50",
            isDeleting && "scale-98 opacity-50",
        )}
    >
        <div class="flex-1 min-w-0 flex items-center gap-4">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    {#if !faviconError}
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`}
                            alt=""
                            class="w-8 h-8 rounded-sm"
                            draggable="false"
                            onerror={() => (faviconError = true)}
                        />
                    {:else}
                        <DefaultFavicon class="w-8 h-8 rounded-sm" />
                    {/if}
                    <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-base font-medium hover:text-primary hover:underline decoration-primary/50 underline-offset-2 truncate block max-w-[400px]"
                    >
                        {bookmark.title}
                    </a>
                </div>
                <p class="text-xs text-muted-foreground truncate mt-1 pl-6">
                    {bookmark.url}
                </p>
            </div>

            <div class="hidden sm:flex items-center gap-4">
                {#if category && colorClass}
                    <Badge
                        variant="secondary"
                        class="{colorClass.bg} {colorClass.text} border-transparent text-xs font-medium px-2 py-0.5 whitespace-nowrap"
                    >
                        {category.name}
                    </Badge>
                {/if}
                <span
                    class="text-xs text-muted-foreground whitespace-nowrap min-w-[80px] text-right"
                >
                    {format(new Date(bookmark.createdAt), "MMM d, yyyy")}
                </span>
            </div>
        </div>

        <div
            class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
            <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 btn-click-effect"
                onclick={handleCopy}
            >
                <Copy class="h-3 w-3" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 hover:text-destructive btn-click-effect"
                onclick={handleDelete}
            >
                <Trash2 class="h-3 w-3" />
            </Button>
            <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-primary/10 text-primary btn-click-effect"
            >
                <ExternalLink class="h-3 w-3" />
            </a>
        </div>
    </div>
{/if}
