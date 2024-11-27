<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        children?: Snippet,
        errors: string | string[] | undefined,
    }

    let { 
        children,
        errors 
    }: Props = $props();
</script>

<div class="mt-2">
    {#if errors}
        {#if Array.isArray(errors)}
            <ul class="whitespace-normal text-[14px] text-error-400">
                {#each errors as error (error)}
                    <li>{error}</li>
                {/each}
            </ul>
        {:else}
            <p class="whitespace-normal text-[14px] text-error-400">
                {errors}
            </p>
        {/if}
    {/if}
    {@render children?.()}
</div>
