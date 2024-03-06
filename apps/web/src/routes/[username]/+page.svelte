<script lang="ts">
    import { createQuery } from "@tanstack/svelte-query";
    import { stexs } from "../../stexsClient";
    import { getUserStore } from "$lib/stores/userStore";
    import { getProfileStore } from "$lib/stores/profileStore";
    import { Dropdown, DropdownDivider, Search } from "flowbite-svelte";
    import { 
        Paginator, 
        type PaginationSettings, 
        RadioGroup, 
        RadioItem, 
        getModalStore, 
        type ModalSettings, 
        ListBoxItem,
        ProgressRadial
    } from "@skeletonlabs/skeleton";
    import { Button, ProjectLogo, ItemThumbnail } from "ui";
    import Icon from "@iconify/svelte";
    import { debounce } from "lodash";

    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    let search: string = '';
    let previousSearch: string = '';
    let projectSearch: string = '';
    let filterTime: string = 'Latest';
    let filterAlphabet: string = ''; 
    let filterAmount: string = '';
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
        limit: 20,
        size: 0,
        amounts: [20, 50, 100],
    };
    let previousProject: number | undefined;
    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    async function fetchProjectsInUsersInventory(userId: string) {
        const { data } = await stexs.rpc('distinct_projects_from_inventory', {
            user_id_param: userId
        });

        return data;
    }

    $: itemsAmountQuery = createQuery({
        queryKey: ['itemsAmountInventory', $profileStore?.userId],
        queryFn: async () => {
            const { count } = await stexs.from('inventories')
            .select('', { 
                count: 'exact', 
                head: true 
            })
            .eq('user_id', $profileStore?.userId);

            return count;
        },
        enabled: !!$profileStore?.userId
    });

    $: paginationSettings.size = $itemsAmountQuery.data;

    $: projectsQuery = createQuery({
        queryKey: ['projectsInInventory', $profileStore?.userId],
        queryFn: async () => await fetchProjectsInUsersInventory($profileStore?.userId!),
        enabled: !!$profileStore?.userId
    });

    async function fetchInventory(userId: string, search: string, filters: {
        filterTime: string,
        filterAlphabet: string,
        filterAmount: string
    }, selectedProject: number | undefined, page: number, limit: number) {
        const { filterTime, filterAlphabet, filterAmount } = filters;

        if (search !== previousSearch || previousProject !== selectedProject) {
            paginationSettings.page = 0;
            page = 0;
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
                )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .ilike('items.name', `%${search}%`)
            .not('items', 'is', null)
            .not('items.projects', 'is', null)
            .range(start, end);

        if (filterTime === 'Latest')
            query
                .order('created_at', { ascending: true })
                .order('updated_at', { ascending: true });

        if (filterTime === 'Oldest')
            query
                .order('created_at', { ascending: false })
                .order('updated_at', { ascending: false });

        if (filterAmount === 'Unique') 
            query.order('amount', { 
                ascending: true, 
                nullsFirst: true 
            });

        if (filterAmount === 'Amount: Low to high')
            query
                .order('amount', { ascending: true });

        if (filterAmount === 'Amount: High to low')
            query
                .order('amount', { 
                    ascending: false, 
                    nullsFirst: false 
                });

        if (filterAlphabet === 'A-Z') query.order('items(name)', { ascending: true });

        if (filterAlphabet === 'Z-A') query.order('items(name)', { ascending: false });

        if (selectedProject !== undefined && typeof selectedProject == 'number')
            query.eq('items.projects.id', selectedProject);

        const { data, count } = await query;

        paginationSettings.size = count;

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

    function openItemModal(params: { [key: string]: any }) {
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

    $: inventoryQuery = createQuery({
        queryKey: ['inventories', $profileStore?.userId],
        queryFn: async () => await fetchInventory($profileStore?.userId!, search, { filterTime, filterAlphabet, filterAmount }, selectedProject, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });
</script>

<div class="flex flex-col sm:flex-row justify-between mb-[18px] space-y-2 sm:space-y-0 sm:space-x-2">
    {#if $inventoryQuery.isLoading || !$inventoryQuery.data}
        <div class="placeholder animate-pulse sm:max-w-[300px] w-full h-[42px] rounded-lg" />
        <div class="w-full sm:w-fit flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div class="placeholder animate-pulse w-full sm:w-[115px] h-[44px]" />
            <div class="placeholder animate-pulse w-full sm:w-[85px] h-[44px]" />
        </div>
    {:else}
        <div class="sm:max-w-[300px] w-full">
            <Search size="lg" placeholder="Item Name" on:input={handleSearch} class="!bg-surface-500" />
        </div>
        <div class="w-full sm:w-fit flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div class="w-full sm:w-fit">
                <Button class="bg-surface-500 border border-gray-600 w-full py-[8px] sm:w-fit">Sort by<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[24px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500 max-h-[400px] overflow-y-auto">
                    <ListBoxItem bind:group={filterTime} name="filter" value='Latest'>Latest</ListBoxItem>
                    <ListBoxItem bind:group={filterTime} name="filter" value='Oldest'>Oldest</ListBoxItem>
                    <ListBoxItem bind:group={filterTime} name="filter" value=''>No Filter</ListBoxItem>
                    <DropdownDivider />
                    <ListBoxItem bind:group={filterAmount} name="filter" value='Unique'>Unique</ListBoxItem>
                    <ListBoxItem bind:group={filterAmount} name="filter" value='Amount: Low to high'>Amount: Low to high</ListBoxItem>
                    <ListBoxItem bind:group={filterAmount} name="filter" value='Amount: High to low'>Amount: High to low</ListBoxItem>
                    <ListBoxItem bind:group={filterAmount} name="filter" value=''>No Filter</ListBoxItem>
                    <DropdownDivider />
                    <ListBoxItem bind:group={filterAlphabet} name="filter" value='A-Z'>A-Z</ListBoxItem>
                    <ListBoxItem bind:group={filterAlphabet} name="filter" value='Z-A'>Z-A</ListBoxItem>
                    <ListBoxItem bind:group={filterAlphabet} name="filter" value=''>No Filter</ListBoxItem>
                </Dropdown>
            </div>
            <div class="w-full md:w-fit">
                <Button class="bg-surface-500 border border-gray-600 w-full py-[8px] md:w-fit">{selectedProjectName}<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[24px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500">
                    <Search size="md" placeholder="Project Name" bind:value={projectSearch} class="!bg-surface-500" />
                    <RadioItem bind:group={selectedProject} name="project" value={undefined}>All</RadioItem>
                    {#if $projectsQuery.isLoading || !$projectsQuery.data}
                        <div class="flex justify-center p-4">
                            <ProgressRadial stroke={40} value={undefined} width="w-[30px]" />
                        </div>
                    {:else}
                        <RadioGroup class="max-h-[200px] overflow-auto" active="variant-glass-primary text-primary-500" hover="hover:bg-surface-500" display="flex-col space-y-1">
                            {#if searchedProjects && searchedProjects.length > 0 }
                                {#each searchedProjects as project (project.id)}
                                    <RadioItem bind:group={selectedProject} name="project" value={project.id} class="group">
                                        <div class="flex flex-row space-x-2">
                                            <div class="w-[48px] h-[48px] bg-surface-600 border border-gray-600 rounded-md inline-flex items-center justify-center text-center">
                                                <ProjectLogo {stexs} projectId={project.id} alt={project.name} class="rounded-md" />
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
            </div>
        </div>
    {/if}
</div>
<div class="mb-[18px]">
    {#if $inventoryQuery.isLoading || !$inventoryQuery.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[42px] w-full md:w-[150px]" />
            <div class="placeholder animate-pulse h-[34px] w-[230px]" />
        </div>
    {:else}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{true}"
            showPreviousNextButtons="{true}"
            amountText="Items"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-gray-600"
        />
    {/if}
</div>
<div class="grid gap-3 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $inventoryQuery.isLoading || !$inventoryQuery.data}
        {#each Array(50) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-full" />
        {/each}
    {:else}
        {#if $inventoryQuery.data && $inventoryQuery.data.length > 0}
            {#each $inventoryQuery.data as inventory (inventory.id)}
                <Button title={inventory.items.name} class="p-0 card-hover aspect-square h-full w-full rounded-md bg-surface-700 border-2 border-surface-600 hover:border-primary-500 cursor-pointer" on:click={() => openItemModal(inventory)}>
                    <ItemThumbnail {stexs} itemId={inventory.items.id} itemName={inventory.items.name} />
                </Button>
            {/each}
        {:else if $itemsAmountQuery?.data > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No items found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-6 text-center">{$userStore?.id === $profileStore?.userId ?  'You have no items in your inventory': 'User has no items in inventory'}</p>
            </div>
        {/if}
    {/if}
</div>
<div class="mt-[18px]">
    {#if $inventoryQuery.isLoading || !$inventoryQuery.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[42px] w-full md:w-[150px]" />
            <div class="placeholder animate-pulse h-[34px] w-[230px]" />
        </div>
    {:else}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{true}"
            showPreviousNextButtons="{true}"
            amountText="Items"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-gray-600"
        />
    {/if}
</div>
