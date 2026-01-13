<script lang="ts">
    import { Popover, Calendar } from "bits-ui";
    import { Bell, Clock, Calendar as CalendarIcon, X } from "lucide-svelte";
    import { Button } from "$lib/components/ui/button";
    import { cn } from "$lib/utils";
    import {
        DateFormatter,
        type DateValue,
        getLocalTimeZone,
        today,
        parseDate,
    } from "@internationalized/date";
    import { toast } from "svelte-sonner";

    let {
        onSave,
        existingDate,
        trigger,
    }: {
        onSave: (date: Date) => void;
        existingDate?: Date;
        trigger?: import("svelte").Snippet<
            [{ props: Record<string, unknown> }]
        >;
    } = $props();

    let value = $derived<DateValue | undefined>(
        existingDate
            ? parseDate(existingDate.toISOString().split("T")[0])
            : undefined,
    );
    let time = $derived(
        existingDate
            ? existingDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
              })
            : "09:00",
    );
    let isOpen = $state(false);

    const df = new DateFormatter("en-US", {
        dateStyle: "medium",
    });

    function handleSave() {
        if (!value) {
            toast.error("Please select a date");
            return;
        }

        const dateStr = value.toString(); // YYYY-MM-DD
        const [hours, minutes] = time.split(":").map(Number);

        const finalDate = new Date(dateStr);
        finalDate.setHours(hours, minutes);

        onSave(finalDate);
        isOpen = false;
        toast.success("Reminder set!");
    }

    function clearReminder() {
        isOpen = false;
    }
</script>

<Popover.Root bind:open={isOpen}>
    <Popover.Trigger>
        {#snippet child({ props })}
            {#if trigger}
                {@render trigger({ props })}
            {:else}
                <Button
                    variant="ghost"
                    size="icon"
                    class={cn(
                        "h-7 w-7 hover:bg-secondary btn-click-effect",
                        existingDate &&
                            "text-primary bg-primary/10 hover:bg-primary/20",
                    )}
                    {...props}
                >
                    <Bell class="h-3.5 w-3.5" />
                </Button>
            {/if}
        {/snippet}
    </Popover.Trigger>
    <Popover.Content
        class="w-auto p-0 bg-popover border border-border rounded-xl shadow-xl z-50 backdrop-blur-xl"
        sideOffset={8}
    >
        <div class="p-4 w-[320px]">
            <div class="flex items-center justify-between mb-4">
                <span class="text-sm font-semibold flex items-center gap-2">
                    <Clock class="h-4 w-4 text-primary" />
                    Set Reminder
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 -mr-2"
                    onclick={() => (isOpen = false)}
                >
                    <X class="h-4 w-4" />
                </Button>
            </div>

            <div class="space-y-4">
                <div class="border rounded-lg p-2 bg-background/50">
                    <Calendar.Root
                        bind:value
                        type="single"
                        class="p-0"
                        weekdayFormat="short"
                        fixedWeeks={true}
                    >
                        {#snippet children({ months, weekdays })}
                            <Calendar.Header
                                class="flex items-center justify-between pb-2"
                            >
                                <Calendar.PrevButton
                                    class="p-1 hover:bg-secondary rounded-md transition-colors"
                                >
                                    <span class="sr-only">Previous</span>
                                    <svg
                                        class="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </Calendar.PrevButton>
                                <Calendar.Heading class="text-sm font-medium" />
                                <Calendar.NextButton
                                    class="p-1 hover:bg-secondary rounded-md transition-colors"
                                >
                                    <span class="sr-only">Next</span>
                                    <svg
                                        class="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </Calendar.NextButton>
                            </Calendar.Header>

                            <div
                                class="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
                            >
                                {#each months as month}
                                    <Calendar.Grid
                                        class="w-full border-collapse space-y-1"
                                    >
                                        <Calendar.GridHead>
                                            <Calendar.GridRow
                                                class="flex w-full justify-between mb-1"
                                            >
                                                {#each weekdays as day}
                                                    <Calendar.HeadCell
                                                        class="text-xs text-muted-foreground w-8 font-normal"
                                                    >
                                                        {day.slice(0, 2)}
                                                    </Calendar.HeadCell>
                                                {/each}
                                            </Calendar.GridRow>
                                        </Calendar.GridHead>
                                        <Calendar.GridBody>
                                            {#each month.weeks as week}
                                                <Calendar.GridRow
                                                    class="flex w-full justify-between mt-1"
                                                >
                                                    {#each week as day}
                                                        <Calendar.Cell
                                                            date={day}
                                                            month={month.value}
                                                            class={cn(
                                                                "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                                                "first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md",
                                                            )}
                                                        >
                                                            <Calendar.Day
                                                                class={cn(
                                                                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-secondary rounded-md transition-colors data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:focus:bg-primary",
                                                                    "data-[today]:bg-secondary/50 data-[today]:text-foreground",
                                                                )}
                                                            >
                                                                {day.day}
                                                            </Calendar.Day>
                                                        </Calendar.Cell>
                                                    {/each}
                                                </Calendar.GridRow>
                                            {/each}
                                        </Calendar.GridBody>
                                    </Calendar.Grid>
                                {/each}
                            </div>
                        {/snippet}
                    </Calendar.Root>
                </div>

                <!-- Time Input -->
                <div class="flex flex-col gap-1.5">
                    <label
                        for="reminder-time"
                        class="text-xs font-medium text-muted-foreground"
                        >Time</label
                    >
                    <div class="relative">
                        <input
                            id="reminder-time"
                            type="time"
                            bind:value={time}
                            class="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Clock
                            class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                        />
                    </div>
                </div>

                <div class="pt-2">
                    <Button class="w-full h-9" onclick={handleSave}>
                        Set Reminder
                    </Button>
                </div>
            </div>
        </div>
    </Popover.Content>
</Popover.Root>
