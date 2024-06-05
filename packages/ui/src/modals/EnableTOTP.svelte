<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { getModalStore } from '@skeletonlabs/skeleton';

    export const parent: SvelteComponent = undefined;

    const modalStore = getModalStore();

    let stexs = $modalStore[0].meta.stexs;
    let flash = $modalStore[0].meta.flash;
    
    function submit() {
        //stexs.auth.mfa.enable('totp', 'code');
    }
    
</script>

{#if $modalStore[0]}
    hi
{/if}