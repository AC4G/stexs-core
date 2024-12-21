<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        header: string,
        children?: Snippet
    }

    let { 
        children,
        header
    }: Props = $props(); 
</script>

<div class="text-center space-y-3">
    <h3 class="text-[24px] py-1 text-primary-500">{header}</h3>
    {@render children?.()}
</div>
