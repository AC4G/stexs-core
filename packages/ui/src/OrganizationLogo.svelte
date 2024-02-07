<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createQuery } from '@tanstack/svelte-query';

    export let stexs: any;
    export let alt: string;
    export let organizationId: number;
    export let iconClass: string = 'text-[46px] rounded-md';

    let loading: boolean = true;
    let loaded: boolean = false;
    let failed: boolean = false;
    let prevUrl: string = '';

    const query = createQuery({
        queryKey: ['organizationLogo', organizationId],
        queryFn: async () => {
            return await stexs.storage.getOrganizationLogoUrl(organizationId)
        }
    });

    const img = new Image();

    $: {
        if ($query.data && prevUrl !== $query.data)
        img.src = $query.data;

        img.onload = () => {
            loading = false;
            loaded = true;
        };

        img.onerror = () => {
            loading = false;
            failed = true;
        };

        prevUrl = $query.data;
    }
</script>

{#if loading}
    <div class="placeholder animate-pulse w-full h-full" />
{:else if failed}
    <Icon icon="uil:image-question" class={iconClass} />
{:else if loaded}
    <img class="h-full w-full object-cover aspect-square {$$restProps.class}" draggable="false" src={prevUrl} {alt} />
{/if}
