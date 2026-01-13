<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Badge } from "$lib/components/ui/badge";
    import { addCategory } from "$lib/stores/categories";
    import { categoryColorClasses } from "$lib/stores/categories";
    import { toast } from "svelte-sonner";
    import {
        User,
        Briefcase,
        Sparkles,
        BookOpen,
        Hash,
        Palette,
        Folder,
        Star,
        Heart,
        Zap,
        Home,
        Code,
        Music,
        Camera,
        Coffee,
        Gamepad2,
        Globe,
        Mail,
        Phone,
        Settings,
        Plus,
    } from "lucide-svelte";

    let open = false;
    let name = "";
    let selectedColor: "emerald" | "violet" | "amber" | "rose" | "sky" = "emerald";
    let selectedIcon = "Hash";

    const colors = ["emerald", "violet", "amber", "rose", "sky"] as const;
    const colorValues = {
        emerald: "oklch(0.696 0.17 162.48)",
        violet: "oklch(0.627 0.265 303.9)",
        amber: "oklch(0.828 0.189 84.429)",
        rose: "oklch(0.645 0.246 16.439)",
        sky: "oklch(0.685 0.169 237.323)",
    };


    const icons = [
        { name: "User", component: User },
        { name: "Briefcase", component: Briefcase },
        { name: "Sparkles", component: Sparkles },
        { name: "BookOpen", component: BookOpen },
        { name: "Hash", component: Hash },
        { name: "Palette", component: Palette },
        { name: "Folder", component: Folder },
        { name: "Star", component: Star },
        { name: "Heart", component: Heart },
        { name: "Zap", component: Zap },
        { name: "Home", component: Home },
        { name: "Code", component: Code },
        { name: "Music", component: Music },
        { name: "Camera", component: Camera },
        { name: "Coffee", component: Coffee },
        { name: "Gamepad2", component: Gamepad2 },
        { name: "Globe", component: Globe },
        { name: "Mail", component: Mail },
        { name: "Phone", component: Phone },
        { name: "Settings", component: Settings },
    ];

    function handleSubmit() {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        addCategory({
            name: name.trim(),
            color: selectedColor,
            icon: selectedIcon,
        });

        toast.success("Category added successfully");
        open = false;
        name = "";
        selectedColor = "emerald";
        selectedIcon = "Hash";
    }

    function selectRandomIcon() {
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        selectedIcon = randomIcon.name;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Trigger>
        {#snippet child({ props })}
            <Button variant="ghost" size="icon" class="h-8 w-8" {...props}>
                <Plus class="h-4 w-4" />
            </Button>
        {/snippet}
    </Dialog.Trigger>

    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Add New Category</Dialog.Title>
            <Dialog.Description>
                Create a new category to organize your bookmarks.
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
            <!-- Category Name -->
            <div class="space-y-2">
                <Label for="category-name">Category Name</Label>
                <Input
                    id="category-name"
                    placeholder="e.g. Travel, Recipes, Tech"
                    bind:value={name}
                    onkeydown={(e) => e.key === "Enter" && handleSubmit()}
                    class="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>

            <!-- Color Selection -->
            <div class="space-y-2">
                <Label>Color</Label>
                <div class="flex gap-2 flex-wrap">
                    {#each colors as color}
                        <button
                            type="button"
                            class="w-8 h-8 rounded-full border-2 transition-all {selectedColor === color
                                ? 'border-foreground scale-110'
                                : 'border-border hover:border-foreground/50'}"
                            style="background-color: {colorValues[color]};"
                            onclick={() => (selectedColor = color)}
                            aria-label="Select {color} color"
                        ></button>
                    {/each}
                </div>
            </div>

            <!-- Icon Selection -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <Label>Icon</Label>
                    <Button variant="outline" size="sm" onclick={selectRandomIcon}>
                        Random
                    </Button>
                </div>
                <div class="grid grid-cols-5 gap-2">
                    {#each icons as { name, component: Icon }}
                        <button
                            type="button"
                            class="p-2 rounded-lg border transition-all {selectedIcon === name
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'}"
                            onclick={() => (selectedIcon = name)}
                        >
                            <Icon class="h-5 w-5" />
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Preview -->
            {#if name.trim()}
                <div class="p-3 rounded-lg bg-secondary/50">
                    <Label class="text-sm text-muted-foreground">Preview</Label>
                    <div class="flex items-center gap-2 mt-1">
                        <Badge
                            variant="secondary"
                            class="{categoryColorClasses[selectedColor].bg} {categoryColorClasses[selectedColor].text} border-transparent text-sm font-medium px-3 py-1"
                        >
                            {#if selectedIcon}
                                {@const Icon = icons.find(i => i.name === selectedIcon)?.component || Hash}
                                <Icon class="h-4 w-4 mr-1" />
                            {/if}
                            {name.trim()}
                        </Badge>
                    </div>
                </div>
            {/if}
        </div>

        <Dialog.Footer>
            <Button variant="outline" onclick={() => (open = false)}>
                Cancel
            </Button>
            <Button onclick={handleSubmit}>
                Add Category
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>