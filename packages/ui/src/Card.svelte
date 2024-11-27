<script lang="ts">
	import { type Snippet } from "svelte";

    interface Props {
        children: Snippet,
        cardColor?: string,
        cardMaxWidth?: string
    }

    let { 
        children,
        cardColor = 'variant-ghost-surface',
        cardMaxWidth = 'max-w-[400px]'
    }: Props = $props();
</script>

<div class="flex items-center justify-center h-full flex-col">
    <div class="card p-5 space-y-6 w-full {cardColor} {cardMaxWidth}">
        {@render children()}
    </div>
</div>
