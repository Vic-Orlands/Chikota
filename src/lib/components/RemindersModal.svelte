<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Bell, Clock, X } from "lucide-svelte";
    import { bookmarks } from "$lib/stores/bookmarks";
    import { format } from "date-fns";
    import { toast } from "svelte-sonner";

    let open = $state(false);

    let reminderBookmarks = $derived(
        $bookmarks.filter(b => b.reminderAt)
    );

    function cancelReminder(bookmarkId: string) {
        bookmarks.updateBookmark(bookmarkId, { reminderAt: undefined });
        toast.success("Reminder cancelled");
    }

    function updateReminder(bookmarkId: string, newDate: Date) {
        bookmarks.updateBookmark(bookmarkId, { reminderAt: newDate });
        toast.success("Reminder updated");
    }
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
                <Bell class="h-4 w-4" />
            </Button>
        {/snippet}
    </Dialog.Trigger>

    <Dialog.Content class="sm:max-w-[500px]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <Bell class="h-5 w-5" />
                Your Reminders
            </Dialog.Title>
            <Dialog.Description>
                Manage your bookmark reminders
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
            {#if reminderBookmarks.length === 0}
                <div class="text-center py-8 text-muted-foreground">
                    <Bell class="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reminders set</p>
                </div>
            {:else}
                {#each reminderBookmarks as bookmark (bookmark.id)}
                    <div class="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`}
                            alt=""
                            class="w-8 h-8 rounded-sm flex-shrink-0 mt-0.5"
                            draggable="false"
                        />
                        <div class="flex-1 min-w-0">
                            <h4 class="font-medium text-sm truncate">{bookmark.title}</h4>
                            <p class="text-xs text-muted-foreground truncate mt-1">{new URL(bookmark.url).hostname}</p>
                            <div class="flex items-center gap-2 mt-2">
                                <Clock class="h-3 w-3 text-primary" />
                                <span class="text-xs text-primary">
                                    {format(new Date(bookmark.reminderAt!), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onclick={() => cancelReminder(bookmark.id)}
                        >
                            <X class="h-4 w-4" />
                        </Button>
                    </div>
                {/each}
            {/if}
        </div>

        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>
                Close
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>