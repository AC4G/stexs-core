<script lang="ts">
    import { getUserStore } from "$lib/stores/userStore";
    import { getProfileStore } from "$lib/stores/profileStore";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { 
        Paginator, 
        type PaginationSettings, 
        type ModalSettings, 
        getModalStore, 
        ListBoxItem,
        type PopupSettings,
        popup
    } from "@skeletonlabs/skeleton";
    import { Dropdown, Search } from "flowbite-svelte";
    import { Button, OrganizationLogo } from 'ui';
    import { getFlash } from 'sveltekit-flash-message/client';
    import { page } from '$app/stores';
    import { debounce } from 'lodash';
    import Icon from "@iconify/svelte";
    import { openCreateOrganizationModal } from "$lib/utils/modals/organizationModals";

    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    const flash = getFlash(page);
    const newOrganizationProfilePopup: PopupSettings = {
        event: 'hover',
        target: 'newOrganizationProfilePopup',
        placement: 'top'
    };
    let search: string = '';
    let previousSearch: string = '';
    let filter: string = 'A-Z';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 20, 
        size: 0,
        amounts: [20, 50, 100],
    };
    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    $: organizationAmountQuery = useQuery({
        queryKey: ['organizationsAmountProfile', $profileStore?.userId, $profileStore?.refetchOrganizationsTrigger],
        queryFn: async () => {
            const { count } = await stexs.from('organization_members')
                .select(`
                    member_id
                `, { 
                    count: 'exact', 
                    head: true 
                })
                .eq('member_id', $profileStore?.userId);

            return count;
        },
        enabled: !!$profileStore?.userId
    });

    $: paginationSettings.size = organizationAmountQueryStore.data;

    async function fetchOrganizations(userId: string, search: string, filter: string, page: number, limit: number) {
        if (search !== previousSearch) {
            paginationSettings.page = 0;
            page = 0;
            previousSearch = search;
        }

        const start = page * limit;
        const end = start + limit - 1;

        const query = stexs.from('organization_members')
            .select(`
                organizations(
                    id,
                    name
                ),
                role
            `, { count: 'exact' })
            .eq('member_id', userId)
            .ilike('organizations.name', `%${search}%`)
            .not('organizations', 'is', null)
            .range(start, end);

        if (filter === 'A-Z') query.order('organizations(name)', { ascending: true });

        if (filter === 'Z-A') query.order('organizations(name)', { ascending: false });

        if (filter === 'Latest') query.order('created_at', { ascending: false });

        if (filter === 'Oldest') query.order('created_at', { ascending: true });

        const { data, count } = await query;

        paginationSettings.size = count;

        return data;
    }
    
    async function leaveOrganization(params: { userId: string, organizationId: number, organizationName: string, role: string}) {
        const { userId, organizationId, organizationName, role } = params;

        if (role === 'Owner') {
            const { count } = await stexs.from('organization_members')
                .select(`
                    organizations(
                        id
                    )
                `, {
                    count: 'exact', 
                    head: true 
                })
                .eq('organizations.id', organizationId)
                .eq('role', 'Owner')
                .not('organizations', 'is', null);

            if (count === 1) {
                $flash = {
                    message: `Could not leave ${organizationName} organization as the only owner. Give someone the Owner role or delete the organization completely.`,
                    classes: 'variant-glass-error',
                    autohide: false
                };
                return;
            }
        }

        const { error } = await stexs.from('organization_members')
            .delete()
            .eq('member_id', userId)
            .eq('organization_id', organizationId);

        if (error) {
            $flash = {
                message: `Could not leave ${organizationName} organization. Try out again.`,
                classes: 'variant-glass-error',
                timeout: 5000,
            };
        } else {
            $flash = {
                message: `Successfully left ${organizationName} organization.`,
                classes: 'variant-glass-success',
                timeout: 5000,
            };

            organizationsMemberQueryStore.data.filter((organizationMember: { organizations: { id: number } }) => organizationMember.organizations.id !== organizationId);
            organizationAmountQueryStore.data--;
        }
    }

    function openLeaveOrganizationModal(userId: string, organizationId: string, organizationName: string, role: string) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'confirm',
            meta: {
                text: `Do you really want to leave ${organizationName}?`,
                function: leaveOrganization,
                fnParams: {
                    userId,
                    organizationId,
                    organizationName,
                    role
                },
                fnAsync: true,
                confirmBtnText: 'Leave',
                confirmBtnClass: 'bg-surface-700 border border-solid border-surface-500 text-red-600',
                confirmBtnLoaderMeter: 'stroke-red-500',
                confirmBtnLoaderTrack: 'stroke-red-500/20'
            }
        };
        modalStore.set([modal]);
    }

    $: organizationsMemberQuery = useQuery({
        queryKey: ['organizationsProfile', $profileStore?.userId, $profileStore?.refetchOrganizationsTrigger],
        queryFn: async () => await fetchOrganizations($profileStore?.userId!, search, filter, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });

    $: organizationAmountQueryStore = $organizationAmountQuery;
    $: organizationsMemberQueryStore = $organizationsMemberQuery;
</script>

<div class="flex flex-col sm:flex-row justify-between {organizationAmountQueryStore?.data > 0 ? 'mb-[18px]' : ''} space-y-2 sm:space-y-0 sm:space-x-2">
    {#if organizationsMemberQueryStore.isLoading || !organizationsMemberQueryStore.data}
        <div class="placeholder animate-pulse sm:max-w-[220px] w-full h-[42px] rounded-lg" />
        <div class="placeholder animate-pulse sm:w-[90px] w-full h-[42px] rounded-lg" />
    {:else if organizationAmountQueryStore.data > 0}
        <div class="flex flex-col sm:flex-row w-full justify-between space-y-2 sm:space-y-0">
            <div class="sm:max-w-[220px]">
                <Search size="lg" placeholder="Organization Name" on:input={handleSearch} class="!bg-surface-500" />
            </div>
            <div class="sm:w-fit">
                <Button class="bg-surface-500 border border-solid border-gray-600 w-full sm:w-fit py-[8px]">{filter}<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[22px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
                    <ListBoxItem bind:group={filter} name="filter" value={'A-Z'}>A-Z</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Z-A'}>Z-A</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Latest'}>Latest</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Oldest'}>Oldest</ListBoxItem>
                </Dropdown>
            </div>
        </div>
        {#if $userStore?.id === $profileStore?.userId}
            <button use:popup={newOrganizationProfilePopup} on:click={() => openCreateOrganizationModal(flash, modalStore, stexs, organizationsMemberQueryStore)} class="relative btn variant-ghost-primary p-[12.89px] h-fit w-full sm:w-fit">
                <Icon icon="pepicons-pop:plus" />
                <div class="p-2 variant-filled-surface rounded-md !ml-0" data-popup="newOrganizationProfilePopup">
                    <p class="text-[14px]">New Organization</p>
                </div>
            </button>
        {/if}
    {/if}
</div>
<div class="{organizationAmountQueryStore?.data > 0 ? 'mb-[18px]' : ''}">
    {#if organizationsMemberQueryStore.isLoading || !organizationsMemberQueryStore.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[42px] w-full md:w-[172px]" />
            <div class="placeholder animate-pulse h-[34px] w-[232px]" />
        </div>
    {:else if organizationAmountQueryStore?.data > 0}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{true}"
            showPreviousNextButtons="{true}"
            amountText="Organizations"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    {/if}
</div>
<div class="grid gap-2">
    {#if organizationsMemberQueryStore.isLoading || !organizationsMemberQueryStore.data}
        {#each Array(10) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-[98px]" />
        {/each}
    {:else}
        {#if organizationsMemberQueryStore.data && organizationsMemberQueryStore.data.length > 0}
            {#each organizationsMemberQueryStore.data as organizationMember (organizationMember.organizations.id)}
                <div class="flex space-x-4 px-2 sm:px-4 py-2 flex-row border border-solid border-surface-600 rounded-lg items-center justify-between">
                        <div class="flex flex-row items-center space-x-4 group">
                            <a href="/organizations/{organizationMember.organizations.name}">
                                <div class="w-[68px] h-[68px] sm:h-[80px] sm:w-[80px] rounded-md bg-surface-700 border border-solid border-surface-600 flex items-center justify-center transition group-hover:bg-surface-600">
                                    <OrganizationLogo {stexs} organizationId={organizationMember.organizations.id} alt={organizationMember.organizations.name} iconClass="text-[46px]" />
                                </div>
                            </a>
                            <div class="flex flex-col space-y-1">
                                <a href="/organizations/{organizationMember.organizations.name}" class="text-secondary-500 group-hover:text-secondary-400 transition break-all text-[16px] sm:text-[18px]">
                                    {organizationMember.organizations.name}
                                </a>
                                <span class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit">{organizationMember.role}</span>
                            </div>
                        </div>
                    <div class="h-fit w-fit space-x-2 flex flex-col space-y-2 sm:space-y-0 justify-center sm:flex-row">
                        {#if $userStore?.id === $profileStore?.userId}
                            {#if (organizationMember.role === 'Owner' ||  organizationMember.role === 'Admin')}
                                <a href="/" class="h-fit text-[16px] sm:text-[18px] bg-surface-700 p-1 border border-solid border-surface-500 btn">Settings</a>
                            {/if}
                            <Button class="h-fit text-[16px] sm:text-[18px] bg-surface-700 p-1 border border-solid border-surface-500 text-red-600" on:click={() => openLeaveOrganizationModal($profileStore.userId, organizationMember.organizations.id, organizationMember.organizations.name, organizationMember.role)} >Leave</Button>
                        {/if}
                    </div>
                </div>
            {/each}
        {:else if organizationsMemberQueryStore?.data > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No organizations found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$userStore?.id === $profileStore?.userId ? 'You haven\'t join any organizations' : 'User is not a member of any organization'}</p>
            </div>
        {/if}
    {/if}
</div>
<div class="{organizationAmountQueryStore?.data > 0 ? 'mt-[18px]' : ''}">
    {#if organizationsMemberQueryStore.isLoading || !organizationsMemberQueryStore.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[42px] w-full md:w-[172px]" />
            <div class="placeholder animate-pulse h-[34px] w-[232px]" />
        </div>
    {:else if organizationAmountQueryStore?.data > 0}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{true}"
            showPreviousNextButtons="{true}"
            amountText="Organizations"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    {/if}
</div>
