<script lang="ts">
    import Icon from "@iconify/svelte";
    import { hideImg } from "./utils/image";
    import { useQuery } from '@sveltestack/svelte-query';

    export let stexs: any;
    export let alt: string;
    export let projectId: string;

    const query = useQuery({
        queryKey: ['projectLogo', projectId],
        queryFn: async () => {
            return await stexs.storage.getProjectLogoUrl(projectId)
        }
    });
</script>

<div class="w-[48px] h-[48px] bg-surface-600 transition border border-solid border-gray-600 rounded-md flex">
    <Icon icon="uil:image-question" class="text-[46px] variant-filled-surface rounded-md" />
    <img src={$query.data} draggable="false" class="h-full w-full object-cover aspect-square rounded-md" {alt} on:error={hideImg} />
</div>
