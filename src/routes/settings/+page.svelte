<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import {
        Moon,
        Sun,
        Monitor,
        Palette,
        Info,
        ArrowLeft,
    } from "lucide-svelte";
    import { onMount } from "svelte";
    import { themeStore } from "$lib/stores/theme.svelte"; // Assuming theme store is used or we use local
    import { tags } from "$lib/stores/tags";
    import { Tags, Trash2, Edit2, X, Check, MoreVertical } from "lucide-svelte";
    import { Input } from "$lib/components/ui/input";
    import { toast } from "svelte-sonner";

    let currentTheme = $state<"light" | "dark" | "system">("system");

    // Tag Management State
    let selectedTags = $state<string[]>([]);
    let editingTagId = $state<string | null>(null);
    let editName = $state("");

    onMount(() => {
        tags.init();
        const stored = localStorage.getItem("chikota-theme");
        if (stored === "dark" || stored === "light") {
            currentTheme = stored;
        }
    });

    function setTheme(theme: "light" | "dark" | "system") {
        currentTheme = theme;

        if (theme === "system") {
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches;
            if (prefersDark) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            localStorage.removeItem("chikota-theme");
        } else if (theme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("chikota-theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("chikota-theme", "light");
        }
    }

    const themeOptions = [
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
    ] as const;
</script>

<div class="space-y-6">
    <!-- Page Header -->
    <header class="space-y-2">
        <div class="flex items-center gap-3">
            <a
                href="/"
                class="inline-flex items-center justify-center h-8 w-8 rounded-lg
                       hover:bg-secondary text-muted-foreground hover:text-foreground
                       transition-colors btn-click-effect"
            >
                <ArrowLeft class="h-4 w-4" />
            </a>
            <div>
                <h1 class="text-xl font-semibold tracking-tight">Settings</h1>
                <p class="text-xs text-muted-foreground">
                    Customize your experience
                </p>
            </div>
        </div>
    </header>

    <!-- Settings Content -->
    <div class="max-w-md space-y-6">
        <!-- Appearance Section -->
        <section class="space-y-3">
            <div
                class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
                <Palette class="h-3 w-3" />
                Appearance
            </div>

            <div
                class="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4"
            >
                <Label class="text-xs text-muted-foreground mb-3 block"
                    >Theme</Label
                >
                <div class="grid grid-cols-3 gap-2">
                    {#each themeOptions as option}
                        {@const isActive = currentTheme === option.value}
                        {@const Icon = option.icon}
                        <button
                            onclick={() => setTheme(option.value)}
                            class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 btn-click-effect
                               {isActive
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border/50 hover:border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground'}"
                        >
                            <Icon class="h-4 w-4" />
                            <span class="text-[10px] font-medium"
                                >{option.label}</span
                            >
                        </button>
                    {/each}
                </div>
            </div>
        </section>

        <!-- Tags Management Section -->
        <section class="space-y-3">
            <div class="flex items-center justify-between">
                <div
                    class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                >
                    <Tags class="h-3 w-3" />
                    Tags
                </div>
                {#if selectedTags.length > 0}
                    <Button
                        variant="destructive"
                        size="sm"
                        class="h-6 text-[10px] px-2"
                        onclick={() => {
                            if (
                                confirm(`Delete ${selectedTags.length} tags?`)
                            ) {
                                tags.deleteTags(selectedTags);
                                selectedTags = [];
                                toast.success("Tags deleted");
                            }
                        }}
                    >
                        <Trash2 class="h-3 w-3 mr-1" />
                        Delete ({selectedTags.length})
                    </Button>
                {/if}
            </div>

            <div
                class="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
            >
                {#if $tags.length === 0}
                    <div class="p-8 text-center text-muted-foreground text-xs">
                        No tags yet. Add tags when creating bookmarks.
                    </div>
                {:else}
                    <div class="divide-y divide-border/40">
                        {#each $tags as tag (tag.id)}
                            <div
                                class="flex items-center justify-between p-3 hover:bg-secondary/40 transition-colors group"
                            >
                                <div class="flex items-center gap-3 flex-1">
                                    <input
                                        type="checkbox"
                                        class="rounded border-input text-primary focus:ring-primary/20"
                                        checked={selectedTags.includes(tag.id)}
                                        onchange={(e) => {
                                            if (e.currentTarget.checked) {
                                                selectedTags = [
                                                    ...selectedTags,
                                                    tag.id,
                                                ];
                                            } else {
                                                selectedTags =
                                                    selectedTags.filter(
                                                        (id) => id !== tag.id,
                                                    );
                                            }
                                        }}
                                    />

                                    {#if editingTagId === tag.id}
                                        <div
                                            class="flex items-center gap-2 flex-1"
                                        >
                                            <Input
                                                bind:value={editName}
                                                class="h-7 text-xs"
                                                autofocus
                                                onkeydown={(e) => {
                                                    if (e.key === "Enter") {
                                                        tags.updateTag(tag.id, {
                                                            name: editName,
                                                        });
                                                        editingTagId = null;
                                                        toast.success(
                                                            "Tag updated",
                                                        );
                                                    } else if (
                                                        e.key === "Escape"
                                                    ) {
                                                        editingTagId = null;
                                                    }
                                                }}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                class="h-7 w-7 text-green-500"
                                                onclick={() => {
                                                    tags.updateTag(tag.id, {
                                                        name: editName,
                                                    });
                                                    editingTagId = null;
                                                    toast.success(
                                                        "Tag updated",
                                                    );
                                                }}
                                            >
                                                <Check class="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                class="h-7 w-7 text-destructive"
                                                onclick={() =>
                                                    (editingTagId = null)}
                                            >
                                                <X class="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    {:else}
                                        <span class="text-sm">{tag.name}</span>
                                        <span
                                            class="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary"
                                        >
                                            {tag.color || "default"}
                                        </span>
                                    {/if}
                                </div>

                                {#if editingTagId !== tag.id}
                                    <div
                                        class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-8 w-8"
                                            onclick={() => {
                                                editingTagId = tag.id;
                                                editName = tag.name;
                                            }}
                                        >
                                            <Edit2
                                                class="h-3.5 w-3.5 text-muted-foreground"
                                            />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-8 w-8 hover:text-destructive"
                                            onclick={() => {
                                                if (
                                                    confirm("Delete this tag?")
                                                ) {
                                                    tags.deleteTag(tag.id);
                                                    toast.success(
                                                        "Tag deleted",
                                                    );
                                                }
                                            }}
                                        >
                                            <Trash2 class="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </section>

        <!-- About Section -->
        <section class="space-y-3">
            <div
                class="flex items-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
            >
                <Info class="h-3 w-3" />
                About
            </div>

            <div
                class="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2"
            >
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">Chikọta</span>
                    <span class="text-[10px] text-muted-foreground">v1.0.0</span
                    >
                </div>
                <p class="text-[10px] text-muted-foreground leading-relaxed">
                    "Chikọta" is an Igbo word meaning "bring together" — a
                    simple, beautiful way to organize your bookmarks.
                </p>
            </div>
        </section>
    </div>
</div>
