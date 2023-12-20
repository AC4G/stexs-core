<script lang="ts">
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../stexsClient";
    import { getUserStore } from "$lib/stores/user";
    import { getProfileStore } from "$lib/stores/profile";
    import { Dropdown, Search } from "flowbite-svelte";
    import { Paginator, type PaginationSettings, RadioGroup, RadioItem, getModalStore, type ModalSettings } from "@skeletonlabs/skeleton";
    import { Button, hideImg } from "ui";
    import Icon from "@iconify/svelte";
    import ItemThumbnail from "ui/src/ItemThumbnail.svelte";

    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    let search: string = '';
    let previousSearch: string = '';
    let projectSearch: string = '';
    $: searchedProjects = $projectsQuery?.data?.filter((project: { id: number, name: string, organization_name: string }) => {
        const searchTerms = projectSearch.toLowerCase().split(' ');

        return searchTerms.some(term =>
            project.name.toLowerCase().includes(term) ||
            project.organization_name.toLowerCase().includes(term)
        );
    });
    let selectedProject: number;
    $: selectedProjectName = selectedProject === undefined || 
        typeof selectedProject === 'string' 
            ? 'All' 
            : $projectsQuery?.data.filter((project: { id: number, name: string }) => project.id === selectedProject)[0].name;
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
        queryKey: ['itemsAmountInventory', $profileStore?.userId],
        queryFn: async () => await fetchTotalAmountFromInventory($profileStore?.userId!),
        enabled: !!$profileStore?.userId
    });

    $: {
        if (paginationSettings.size === 0 && $itemsAmountQuery.data !== undefined) paginationSettings.size = $itemsAmountQuery.data;
    };

    $: projectsQuery = useQuery({
        queryKey: ['projectsInInventory', $profileStore?.userId],
        queryFn: async () => await fetchProjectsInUsersInventory($profileStore?.userId!),
        enabled: !!$profileStore?.userId
    });

    async function fetchInventory(userId: string, search: string, selectedProject: number | undefined, page: number, limit: number) {
        if (search !== previousSearch || previousProject !== selectedProject) {
            paginationSettings.page = 0;
            page = 0;

            const query = stexs.from('inventories')
            .select(`
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

            if (selectedProject !== undefined && typeof selectedProject == 'number') {
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
                items(
                    id,
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

    async function fetchItemFromInventory(userId: string, itemId: number) {
        const { data } = await stexs.from('inventories')
            .select(`
                amount,
                parameter,
                updated_at,
                items(
                    description,
                    projects(
                        name,
                        organizations(
                            name
                        )
                    )
                )`)
            .eq('user_id', userId)
            .eq('item_id', itemId)
            .single();

        return data;
    }

    async function openModal(params: { [key: string]: any }) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'inventoryItem',
            meta: {
                data: params,
                fn: fetchItemFromInventory($profileStore?.userId!, params.items.id),
                stexsClient: stexs
            }
        };
        modalStore.set([modal]);
    }

    $: inventoryQuery = useQuery({
        queryKey: ['inventories', $profileStore?.userId],
        queryFn: async () => await fetchInventory($profileStore?.userId!, search, selectedProject, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });
</script>

{#if $itemsAmountQuery?.data > 0}
    <div class="flex flex-col md:flex-row justify-between mb-[18px] space-y-2 md:space-y-0">
        <div class="md:max-w-[220px]">
            <Search size="lg" placeholder="Item Name" bind:value={search} class="!bg-surface-500" />
        </div>
        <div class="w-full md:w-fit flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <Button class="bg-surface-500 border border-solid border-gray-600 w-full md:w-fit">{selectedProjectName}<Icon
                icon="iconamoon:arrow-down-2-duotone"
                class="text-[24px]"
              /></Button>
            <Dropdown class="left-[-20px] rounded-md bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
                <div class="">
                    <Search size="md" placeholder="Project" bind:value={projectSearch} class="!bg-surface-500" />
                </div>
                <RadioItem bind:group={selectedProject} name="project" value={undefined}>All</RadioItem>
                {#if $projectsQuery.isLoading }
                    <RadioGroup class="max-h-[280px] overflow-auto" active="variant-filled-primary" hover="hover:bg-surface-500 transition" display="flex-col space-y-1">
                        {#each Array(10) as _}
                            <div class="flex flex-row space-x-2 px-4 py-1">
                                <div class="placeholder animate-pulse w-[48px] h-[48px]" />
                                <div class="flex flex-col space-y-2 w-[130px]">
                                    <div class="placeholder animate-pulse h-[20px]" />
                                    <div class="placeholder animate-pulse h-[20px]" />
                                </div>
                            </div>
                        {/each}
                    </RadioGroup>
                {:else}
                    <RadioGroup class="max-h-[200px] overflow-auto" active="variant-filled-primary" hover="hover:bg-surface-500 transition" display="flex-col space-y-1">
                        {#if searchedProjects && searchedProjects.length > 0 }
                            {#each searchedProjects as project}
                                <RadioItem bind:group={selectedProject} name="project" value={project.id} class="group">
                                    <div class="flex flex-row space-x-2">
                                        <div class="w-[48px] h-[48px] bg-surface-600 transition border border-solid border-gray-600 rounded-md">
                                                <Icon icon="uil:image-question" class="text-[46px] variant-filled-surface rounded-md" />
                                                <img src="http://localhost:9000/projects/{project.id}.webp" draggable="false" alt={project.name} class="h-full w-full object-cover aspect-square" on:error={hideImg} />
                                        </div>
                                        <div class="flex flex-col">
                                            <p class="text-[14px]">{project.name}</p>
                                            <p class="text-[14px]">{project.organization_name}</p>
                                        </div>
                                    </div>
                                </RadioItem>
                            {/each}
                        {:else if searchedProjects?.length ===  0}
                            <div class="h-[56px] px-4 p-1 flex justify-center items-center">
                                <p class="text-[18px]">No projects found</p>
                            </div>
                        {/if}
                    </RadioGroup>
                {/if}
            </Dropdown>
            <p class="text-[18px]">Items: {paginationSettings.size}</p>
        </div>
    </div>
{/if}
<div class="grid gap-3 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $inventoryQuery.isLoading}
        {#each Array(20) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-full" />
        {/each}
    {:else}
        {#if $inventoryQuery.data && $inventoryQuery.data.length > 0}
            {#each $inventoryQuery.data.reverse() as inventory}
                <Button class="p-0 aspect-square h-full w-full rounded-md bg-surface-700 border border-solid border-surface-600 cursor-pointer" on:click={() => openModal(inventory)}>
                    <ItemThumbnail {stexs} itemId={inventory.items.id} itemName={inventory.items.name} />
                </Button>
            {/each}
        {:else if $itemsAmountQuery?.data > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No items found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$userStore?.id === $profileStore?.userId ?  'You have no items in your inventory': 'User has no items in inventory'}</p>
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
