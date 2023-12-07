<script lang="ts">
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../stexsClient";
    import { user } from "$lib/stores/user";
    import { profile } from "$lib/stores/profile";

    async function fetchInventory(userId: string) {
        const { data } = await stexs.from('inventories').select('id,item_id,user_id,amount,parameter,created_at,updated_at').eq('user_id', userId);
        return data;
    }

    $: inventoryQuery = useQuery({
        queryKey: ['inventories', $profile?.userId],
        queryFn: async () => await fetchInventory($profile?.userId!),
        enabled: !!$profile?.userId && ($profile.isPrivate === false || $profile.isFriend)
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
                <p class="text-[18px] p-4 text-center">{$user?.id === $profile?.userId ?  'You have no items in your inventory': 'User has no items in inventory'}</p>
            </div>
        {/if}
    {/if}
</div>
