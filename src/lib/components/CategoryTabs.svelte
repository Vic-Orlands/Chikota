<script lang="ts">
    import {
        categories,
        activeCategoryId,
        categoryColorClasses,
    } from "$lib/stores/categories";
    import { bookmarkCounts } from "$lib/stores/bookmarks";
    import {
        Plus,
        User,
        Briefcase,
        Sparkles,
        BookOpen,
        Hash,
    } from "lucide-svelte";
    import type { ComponentType } from "svelte";
    import { cn } from "$lib/utils";
    import AddCategoryDialog from "$lib/components/AddCategoryDialog.svelte";

    const categoryIcons: Record<string, ComponentType> = {
        User: User,
        Briefcase: Briefcase,
        Sparkles: Sparkles,
        BookOpen: BookOpen,
    };
</script>

<div class="relative">
    <div
        class="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 px-0.5"
    >
        {#each $categories as category (category.id)}
            {@const isActive = $activeCategoryId === category.id}
            {@const colorClass = categoryColorClasses[category.color]}
            {@const count = $bookmarkCounts[category.id] || 0}
            {@const Icon = categoryIcons[category.icon] || Hash}

            <button
                onclick={() => activeCategoryId.set(category.id)}
                class={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
                    "transition-all duration-300 ease-out whitespace-nowrap",
                    "focus-ring btn-click-effect",
                    isActive
                        ? `${colorClass.bg} ${colorClass.text} ${colorClass.border} border shadow-sm`
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
            >
                <Icon class="w-4 h-4" />
                <span>{category.name}</span>
                {#if count > 0}
                    <span
                        class={cn(
                            "text-xs px-1.5 py-0.5 rounded-md ml-0.5 transition-colors duration-200",
                            isActive
                                ? "bg-white/20 dark:bg-black/20"
                                : "bg-secondary",
                        )}
                    >
                        {count}
                    </span>
                {/if}

                <!-- Active indicator dot -->
                {#if isActive}
                    <div
                        class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60"
                    ></div>
                {/if}
            </button>
        {/each}

        <!-- Add category button -->
        <AddCategoryDialog />
    </div>
</div>

<style>
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
</style>
