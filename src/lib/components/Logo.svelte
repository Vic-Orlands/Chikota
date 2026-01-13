<script lang="ts">
    let { size = "md" }: { size?: "sm" | "md" | "lg" } = $props();

    const sizes = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
    };
</script>

<div class="flex items-center gap-1.5 select-none {sizes[size]}">
    <span class="font-bold tracking-tight text-primary"> Chikọta </span>
</div>
