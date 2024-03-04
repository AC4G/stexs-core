<script lang="ts">
    export let field: string = '';
    export let value: string | boolean | undefined | null = '';
    export let checked: boolean = false;
    export let labelClass: string = 'label';
    export let inputClass: string = 'input';
    export let withLabel: boolean = true;
    export let labelAfter: boolean = false;
</script>

{#if $$restProps.type === 'checkbox'}
    {#if withLabel}
        <label for={field} class="{labelClass}">
            {#if labelAfter}
                <input id={field} class="{inputClass}" type="checkbox" bind:checked on:input {...$$restProps} />
                <span><slot /></span>
            {:else}
                <span><slot /></span>
                <input id={field} class="{inputClass}" type="checkbox" bind:checked on:input {...$$restProps} />
            {/if}
        </label>
    {:else}
        <input id={field} class="{inputClass}" type="checkbox" bind:checked on:input {...$$restProps} />
    {/if}
{:else}
    {#if withLabel}
        <label for={field} class="{labelClass}">
            {#if labelAfter}
                <input id={field} class="{inputClass}" bind:value on:input {...$$restProps} />
                <span><slot /></span>
            {:else}
                <span><slot /></span>
                <input id={field} class="{inputClass}" bind:value on:input {...$$restProps} />
            {/if}
        </label>
    {:else}
        <input id={field} class="{inputClass}" bind:value on:input {...$$restProps} />
    {/if}
{/if}
