<script lang="ts">
    import { SvelteComponent } from "svelte";
    import { getModalStore } from '@skeletonlabs/skeleton';
    import MFA from '../MFA.svelte';

    export let parent: SvelteComponent;

    const modalStore = getModalStore();

    let stexs = $modalStore[0].meta.stexs;
    let flash = $modalStore[0].meta.flash;
    let types = $modalStore[0].meta.types;
    let confirmMFA = $modalStore[0].meta.confirmMFA;
    let type = '_selection';

    const cancel = () => modalStore.close();
</script>

{#if $modalStore[0]}
    <MFA {stexs} {flash} {types} {cancel} confirm={confirmMFA} bind:type />
{/if}

