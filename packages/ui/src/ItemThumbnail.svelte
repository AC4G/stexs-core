<script lang="ts">
    import { useQuery } from '@sveltestack/svelte-query';

    export let stexs: any;
    export let itemId: string;
    export let itemName: string;

    $: query = useQuery({
        queryKey: ['itemThumbnail', itemId],
        queryFn: async () => {
            return { 
                url: (await (await stexs.storage.getItemThumbnailUrl(itemId)).json()).url
            };
        },
        enabled: !!itemId
    });
</script>

<img class="h-full w-full object-cover rounded-none" draggable="false" src={$query.data?.url} alt={itemName} />
