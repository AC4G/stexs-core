<script lang="ts">
	import { type Snippet } from "svelte";

    interface Props {
        children: Snippet,
        containerClass?: string,
        cardColor?: string,
        cardMaxWidth?: string
    }

    let { 
        children,
        containerClass,
        cardColor = 'variant-ghost-surface',
        cardMaxWidth = 'max-w-[400px]'
    }: Props = $props();
</script>

<div class="flex items-center justify-center h-full flex-col {containerClass}">
    <div class="card p-5 space-y-6 w-full {cardColor} {cardMaxWidth}">
        {@render children()}
    </div>
</div> 
