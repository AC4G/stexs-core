<script lang="ts">
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../stexsClient";
    import { user } from "$lib/stores/user";
    import { profile } from "$lib/stores/profile";
    import { Dropdown, Radio, Search } from "flowbite-svelte";
    import { Paginator, type PaginationSettings } from "@skeletonlabs/skeleton";
    import { Button } from "ui";
    import Icon from "@iconify/svelte";

    let search: string = '';
    let previousSearch: string = '';
    let selectedProject: number;
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50,
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };
    let previousProject: number | undefined;

    async function fetchTotalAmountFromInventory(userId: string) {
        const { count } = await stexs.from('inventories')
            .select('id', { 
                count: 'exact', 
                head: true 
            })
            .eq('user_id', userId);

        return count;
    }

    async function fetchProjectsInUsersInventory(userId: string) {
        const { data } = await stexs.rpc('distinct_projects_from_inventory', {
            user_id_param: userId
        });

        return data;
    }

    $: itemsAmountQuery = useQuery({
        queryKey: ['itemsAmountInventory', $profile?.userId],
        queryFn: async () => await fetchTotalAmountFromInventory($profile?.userId!),
        enabled: !!$profile?.userId
    });

    $: {
        if (paginationSettings.size === 0 && $itemsAmountQuery.data !== undefined) paginationSettings.size = $itemsAmountQuery.data;
    };

    $: projectsQuery = useQuery({
        queryKey: ['projectsInInventory', $profile?.userId],
        queryFn: async () => await fetchProjectsInUsersInventory($profile?.userId!),
        enabled: !!$profile?.userId
    });

    async function fetchInventory(userId: string, search: string, selectedProject: number | undefined, page: number, limit: number) {
        if (search !== previousSearch || previousProject !== selectedProject) {
            paginationSettings.page = 0;
            page = 0;

            const query = stexs.from('inventories')
            .select(`
                id,
                amount,
                parameter,
                created_at,
                updated_at,
                items(
                    name,
                    projects(
                        id
                    )
                )`, { count: 'exact', head: true })
            .eq('user_id', userId)
            .ilike('items.name', `%${search}%`)
            .not('items', 'is', null)
            .not('items.projects', 'is', null);

            if (selectedProject !== undefined) {
                query.eq('items.projects.id', selectedProject);
            }

            const { count } = await query;

            paginationSettings.size = count;
            previousSearch = search;
            previousProject = selectedProject;
        }

        const start = page * limit;
        const end = start + limit - 1;

        const query = stexs.from('inventories')
            .select(`
                id,
                amount,
                parameter,
                created_at,
                updated_at,
                items(
                    name,
                    projects(
                        id
                    )
                )`)
            .eq('user_id', userId)
            .ilike('items.name', `%${search}%`)
            .not('items', 'is', null)
            .not('items.projects', 'is', null)
            .range(start, end);

        if (selectedProject !== undefined && typeof selectedProject == 'number') {
            query.eq('items.projects.id', selectedProject);
        }

        const { data } = await query;

        return data;
    }

    $: inventoryQuery = useQuery({
        queryKey: ['inventories', $profile?.userId],
        queryFn: async () => await fetchInventory($profile?.userId!, search, selectedProject, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profile?.userId
    });
</script>

{#if $itemsAmountQuery?.data > 0}
    <div class="flex flex-col md:flex-row justify-between mb-[18px] space-y-2 md:space-y-0">
        <div class="md:max-w-[220px]">
            <Search size="lg" placeholder="Item Name" bind:value={search} class="!bg-surface-500" />
        </div>
        <div class="">
            <Button class="bg-surface-500 border border-solid border-gray-600">Projects<Icon
                icon="iconamoon:arrow-down-2-duotone"
                class="text-[24px]"
              /></Button>
            <Dropdown class="absolute left-[-20px] rounded-md bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
                <Radio bind:group={selectedProject} value={undefined}>All</Radio>
                {#if $projectsQuery?.data.length > 0}
                    {#each $projectsQuery.data as project}
                        <Radio bind:group={selectedProject} value={project.id}>{project.name}</Radio>
                    {/each}
                {/if}
            </Dropdown>
        </div>
    </div>
{/if}
<div class="grid gap-4 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $inventoryQuery.isLoading}
        {#each Array(20) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-full" />
        {/each}
    {:else}
        {#if $inventoryQuery.data && $inventoryQuery.data.length > 0}
            {#each $inventoryQuery.data as inventory}
                <div class="aspect-square h-full w-full rounded-md bg-surface-700 border border-solid border-surface-600 p-2">
                    {inventory.items.name}
                </div>
            {/each}
        {:else if $itemsAmountQuery?.data > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No items found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$user?.id === $profile?.userId ?  'You have no items in your inventory': 'User has no items in inventory'}</p>
            </div>
        {/if}
    {/if}
</div>
{#if $itemsAmountQuery?.data > 0}
    <div class="mx-auto mt-[18px]">
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{false}"
            showPreviousNextButtons="{true}"
            showNumerals
            amountText="Items"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    </div>
{/if}
