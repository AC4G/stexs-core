<script lang="ts">
    import Icon from "@iconify/svelte";
    import { useQuery } from '@sveltestack/svelte-query';

    export let stexs: any;
    export let alt: string;
    export let projectId: number;
    export let iconSize: string = '46px';

    let loading: boolean = true;
    let loaded: boolean = false;
    let failed: boolean = false;
    let prevUrl: string = '';

    const query = useQuery({
        queryKey: ['projectLogo', projectId],
        queryFn: async () => {
            return await stexs.storage.getProjectLogoUrl(projectId)
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
    <Icon icon="uil:image-question" class="text-[{iconSize}] variant-filled-surface rounded-md" />
{:else if loaded}
    <img class="h-full w-full object-cover aspect-square {$$restProps.class}" draggable="false" src={prevUrl} {alt} />
{/if}
