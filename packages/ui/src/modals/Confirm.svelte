<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { getModalStore } from '@skeletonlabs/skeleton';
    import Button from '../Button.svelte';

    let submitted: boolean = false;

    export let parent: SvelteComponent;

    const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
    <div class="card p-5 space-y-6 flex items-center flex-col">
        <p class="text-[18px] max-w-[320px]">{$modalStore[0].meta.text}</p>
        <div class="flex justify-between w-full">
            <Button class="variant-ringed-surface hover:bg-surface-600" on:click={parent.onClose}>{parent.buttonTextCancel}</Button>
            {#if $modalStore[0].meta.fnAsync}
                <Button on:click={async () => { 
                    submitted = true;
                    await $modalStore[0].meta.function($modalStore[0].meta.fnParams);
                    modalStore.close();
                }} class="variant-filled-primary" {submitted}>Confirm</Button>
            {:else}
                <Button on:click={() => {
                    submitted = true;
                    $modalStore[0].meta.function($modalStore[0].meta.fnParams);
                    modalStore.close();
                }} class="variant-filled-primary" {submitted} >Confirm</Button>
            {/if}
        </div>
    </div>
{/if}


