<script lang="ts">
	import OrganizationLogo from './../../../../../../packages/ui/src/OrganizationLogo.svelte';
    import { getUserStore } from "$lib/stores/user";
    import { getProfileStore } from "$lib/stores/profile";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { Paginator, type PaginationSettings } from "@skeletonlabs/skeleton";
    import { Search } from "flowbite-svelte";
    import { Button } from 'ui';

    const profileStore = getProfileStore();
    const userStore = getUserStore();
    let search: string = '';
    let previousSearch: string = '';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50, 
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };

    $: organizationAmountQuery = useQuery({
        queryKey: ['organizationsAmountProfile', $profileStore?.userId],
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

    $: {
        if (paginationSettings.size === 0 && $organizationAmountQuery.data !== undefined) paginationSettings.size = $organizationAmountQuery.data;
    };

    $: organizationsMemberQuery = useQuery({
        queryKey: ['organizationsProfile', $profileStore?.userId],
        queryFn: async () => {
            const { data } = await stexs.from('organization_members')
                .select(`
                    organizations(
                        id,
                        name
                    ),
                    role
                `)
                .eq('member_id', $profileStore?.userId);

            return data;
        },
        enabled: !!$profileStore?.userId
    });
</script>

<div class="flex flex-col md:flex-row justify-between mb-[18px] space-y-2 md:space-y-0">
    {#if $organizationsMemberQuery.isLoading || !$organizationsMemberQuery.data}
        <div class="placeholder animate-pulse md:max-w-[220px] w-full h-[42px] rounded-lg" />
        <div class="w-full md:w-fit flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse w-full md:w-[80px] h-[24px]" />
        </div>
    {:else if $organizationAmountQuery.data > 0}
        <div class="md:max-w-[220px]">
            <Search size="lg" placeholder="Organization Name" bind:value={search} class="!bg-surface-500" />
        </div>
        <div class="w-full md:w-fit flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <p class="text-[18px]">Organizations {paginationSettings.size}</p>
        </div>
    {/if}
</div>
<div class="grid gap-3">
    {#if $organizationsMemberQuery.isLoading || !$organizationsMemberQuery.data}
        {#each Array(50) as _}
            <div class="placeholder animate-pulse aspect-square w-full h-[98px]" />
        {/each}
    {:else}
        {#if $organizationsMemberQuery.data && $organizationsMemberQuery.data.length > 0}
            {#each $organizationsMemberQuery.data as organizationMember (organizationMember.organizations.id)}
                <div class="flex px-4 py-2 flex-row border border-solid border-surface-600 rounded-lg items-center justify-between">
                    <a href="/" class="flex flex-row items-center space-x-4 group">
                        <div class="p-0 aspect-square h-[80px] w-[80px] rounded-md bg-surface-700 border border-solid border-surface-600 cursor-pointer flex items-center justify-center transition group-hover:bg-surface-600">
                            <OrganizationLogo {stexs} organizationId={organizationMember.organizations.id} alt={organizationMember.organizations.id} iconClass="text-[46px]" />
                        </div>
                        <p class="text-secondary-500 group-hover:text-secondary-400 transition">{organizationMember.organizations.name}</p>
                    </a>
                    <div class="h-fit w-fit space-x-2">
                        {#if organizationMember.role === 'Owner' ||  organizationMember.role === 'Admin'}
                            <Button class="h-fit text-[18px] bg-surface-700 p-2 border border-solid border-surface-500">Settings</Button>
                        {/if}
                        <Button class="h-fit text-[18px] bg-surface-700 p-2 border border-solid border-surface-500 text-red-600" >Leave</Button>
                    </div>
                </div>
            {/each}
        {:else if $organizationsMemberQuery?.data > 0 && search.length > 0}
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
<div class="mx-auto mt-[18px]">
    {#if $organizationsMemberQuery.isLoading || !$organizationsMemberQuery.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[44px] w-full md:w-[182px]" />
            <div class="placeholder animate-pulse h-[38px] w-[110px]" />
        </div>
    {:else if $organizationAmountQuery?.data > 0}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{false}"
            showPreviousNextButtons="{true}"
            showNumerals
            amountText="Organizations"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    {/if}
</div>
