<script lang="ts">
    let {
        size = "md",
        color = "primary",
    }: {
        size?: "xs" | "sm" | "md" | "lg";
        color?: "primary" | "accent" | "muted";
    } = $props();

    const sizes = {
        xs: "w-3 h-3 border",
        sm: "w-4 h-4 border-[1.5px]",
        md: "w-5 h-5 border-2",
        lg: "w-6 h-6 border-2",
    };

    const colors = {
        primary: "border-primary border-t-transparent",
        accent: "border-accent border-t-transparent",
        muted: "border-muted-foreground border-t-transparent",
    };
</script>

<div
    class="rounded-full spinner {sizes[size]} {colors[color]}"
    role="status"
    aria-label="Loading"
>
    <span class="sr-only">Loading...</span>
</div>
