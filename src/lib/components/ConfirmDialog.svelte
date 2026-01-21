<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";
    import { AlertTriangle } from "lucide-svelte";

    let {
        open = $bindable(false),
        title = "Confirm Action",
        description = "Are you sure you want to proceed?",
        confirmText = "Confirm",
        cancelText = "Cancel",
        variant = "destructive",
        onConfirm,
    }: {
        open?: boolean;
        title?: string;
        description?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "destructive" | "default";
        onConfirm: () => void | Promise<void>;
    } = $props();

    async function handleConfirm() {
        await onConfirm();
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[400px] p-0 gap-0 overflow-hidden">
        <div class="p-6 text-center">
            <div
                class="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center"
            >
                <AlertTriangle class="h-6 w-6 text-destructive" />
            </div>
            <Dialog.Title class="text-lg font-semibold mb-2"
                >{title}</Dialog.Title
            >
            <Dialog.Description class="text-sm text-muted-foreground">
                {description}
            </Dialog.Description>
        </div>
        <div class="grid grid-cols-2 border-t border-border">
            <Button
                variant="ghost"
                class="rounded-none border-r border-border h-12"
                onclick={() => (open = false)}
            >
                {cancelText}
            </Button>
            <Button
                variant="ghost"
                class="rounded-none h-12 {variant === 'destructive'
                    ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                    : ''}"
                onclick={handleConfirm}
            >
                {confirmText}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
