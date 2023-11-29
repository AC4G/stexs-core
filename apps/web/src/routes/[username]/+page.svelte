<script lang="ts">
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../stexsClient";
    import { getContext } from "svelte";
    import { user } from "$lib/stores/user";

    let { userId, isPrivate, isFriend }: { userId: string, isPrivate: boolean, isFriend: boolean } = getContext('profile');

    async function fetchInventory(userId: string) {
        const { data } = await stexs.from('inventories').select('id,item_id,user_id,amount,parameter,created_at,updated_at').eq('user_id', userId);
        return data;
    }

    $: inventoryQuery = useQuery({
        queryKey: ['inventories', userId],
        queryFn: async () => await fetchInventory(userId),
        enabled: !!userId && (isPrivate === false || !!isFriend)
    });
</script>

<div class="grid gap-4 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $inventoryQuery.isLoading}
        {#each Array(20) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-full" />
        {/each}
    {:else}
        {#if $inventoryQuery.data && $inventoryQuery.data.length > 0}
            {#each $inventoryQuery.data as inventory}
                <div class="w-[80px] h-[80px] rounded-md variant-filled-surface">
                    {inventory.item_id}
                </div>
            {/each}
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$user?.id === userId ?  'You have no items in your inventory at the moment': 'User has no items in inventory at the moment'}</p>
            </div>
        {/if}
    {/if}
</div>
