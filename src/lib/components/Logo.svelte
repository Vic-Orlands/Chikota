<script lang="ts">
    let { size = "md" }: { size?: "sm" | "md" | "lg" } = $props();

    const sizes = {
        sm: "text-3xl",
        md: "text-4xl",
        lg: "text-5xl",
    };
</script>

<div class="flex items-center gap-1.5 select-none {sizes[size]}">
    <span class="font-heading font-normal text-primary"> chikọta </span>
</div>
