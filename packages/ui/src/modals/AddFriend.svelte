<script lang="ts">
    import type { SvelteComponent } from 'svelte';
    import { getModalStore, Paginator, type PaginationSettings, ListBoxItem } from '@skeletonlabs/skeleton';
    import Icon from "@iconify/svelte";
    import Button from '../Button.svelte';
    import { Dropdown, DropdownDivider, Search } from "flowbite-svelte";
    import { useQuery } from '@sveltestack/svelte-query';
    import { debounce } from "lodash";
    import Avatar from '../Avatar.svelte';

    export let parent: SvelteComponent;

    const modalStore = getModalStore();
    const stexs = $modalStore[0].meta.stexsClient;
    const userId = $modalStore[0].meta.userId;
    const flash = $modalStore[0].meta.flash;
    let search: string = '';
    let filter: string = 'All';
    let submitted: number;
    let operationSubmitted: boolean = false;
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 20, 
        size: 0,
        amounts: [20, 50],
    };
    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    async function fetchUserProfiles(search: string, filter: string, page: number, limit: number) {
        if (search.length === 0 && filter === 'All') {
            paginationSettings.size = 0;
            return;
        }

        const start = page * limit;
        const end = start + limit - 1;

        const { data, count } = await stexs.from('profiles')
            .select(`
                user_id,
                username,
                accept_friend_requests,
                friends!friends_friend_id_fkey(
                    user_id
                ),
                friend_requests!friend_requests_addressee_id_fkey${filter === 'Pending' ? '!inner': ''}(
                    requester_id
                )
            `, { count: 'exact' })
            .ilike('username', `%${search}%`)
            .order('username', { ascending: true })
            .eq('friends.user_id', userId)
            .eq('friend_requests.requester_id', userId)
            .range(start, end);

        paginationSettings.size = count;
        
        return data;
    }

    $: searchForFriendsQuery = useQuery({
        queryKey: ['searchForFriends', userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => fetchUserProfiles(search, filter, paginationSettings.page, paginationSettings.limit)
    });
</script>

{#if $modalStore[0]}
    <div class="card p-3 sm:p-5 space-y-6 flex flex-col max-w-[958px] min-h-[90vh] w-full relative">
        <div>
            <div class="absolute right-[8px] top-[8px]">
                <Button on:click={parent.onClose} class="p-3 hover:text-gray-600">
                    <Icon icon="ph:x-bold" />
                </Button>
            </div>
            <div class="h-fit">
                <p class="text-[22px]">Add Friend</p>
            </div>
        </div>
        <div class="flex flex-col sm:flex-row w-full justify-between space-y-2 sm:space-y-0 sm:space-x-4 items-center">
            <Search size="lg" placeholder="Username" on:input={handleSearch} class="!bg-surface-500 !outline-none" />
            <div class="w-full sm:w-fit">
                <Button class="bg-surface-500 border border-solid border-gray-600 w-full sm:w-fit py-[8px]">{filter}<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[22px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
                    <ListBoxItem bind:group={filter} name="filter" value={'All'} active="variant-filled-primary" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">All</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Pending'} active="variant-filled-primary hover:variant-filled-primary" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">Pending</ListBoxItem>
                </Dropdown>
            </div>
        </div>
        {#if $searchForFriendsQuery.isLoading}
            <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div class="placeholder animate-pulse h-[44px] w-full md:w-[150px]" />
                <div class="placeholder animate-pulse h-[38px] w-[110px]" />
            </div>
        {:else if paginationSettings.size > 0 }
            <Paginator
                bind:settings={paginationSettings}
                showFirstLastButtons="{true}"
                showPreviousNextButtons="{true}"
                amountText="Users"
                select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
                controlVariant="bg-surface-500 border border-solid border-gray-600"
            />
        {/if}
        <div class="flex flex-col items-center space-y-2">
            {#if $searchForFriendsQuery.isLoading}
                {#each Array(10) as _}
                    <div class="placeholder animate-pulse aspect-square w-full h-[62px] sm:h-[72px]" />
                {/each}
            {:else if $searchForFriendsQuery.data}
                {#each $searchForFriendsQuery.data as profile, i (profile.user_id)}
                    <div class="flex flex-row rounded-md transition items-center justify-between px-2 sm:px-4 py-2 w-full border border-solid border-surface-600 space-x-4">
                        <a href="/{profile.username}" on:click={parent.onClose} class="flex justify-left group gap-4">
                            <div class="w-fit h-fit">
                                <Avatar class="w-[44px] h-[44px] sm:w-[54px] sm:h-[54px]" userId={profile.user_id} username={profile.username} {stexs} />
                            </div>
                            <div class="w-fit h-full">
                                <p class="text-[14px] sm:text-[16px] text-left break-all group-hover:text-secondary-400 transition">{profile.username}</p>
                            </div>
                        </a>
                        <div class="w-fit h-fit">
                            {#if profile.friends?.length > 0}
                                <p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">Is Friend</p>
                            {:else if profile.user_id === userId}
                                <p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">You</p>
                            {:else if profile.friend_requests.length > 0}
                                <Button submitted={submitted === i} on:click={async () => {
                                    if (operationSubmitted) return;

                                    operationSubmitted = true;

                                    submitted = i;
                                    await $modalStore[0].meta.revokeFriendRequest(userId, profile.user_id, flash);
                                    submitted = null;
                                    $searchForFriendsQuery.refetch();

                                    operationSubmitted = false;
                                }} title="Revoke Friend Requests" class="h-fit text-[14px] variant-ghost-error py-2 px-2" progressClass="w-[14px]">
                                    <Icon icon="pepicons-pop:minus" />
                                </Button>
                            {:else if profile.accept_friend_requests}
                                <Button submitted={submitted === i} on:click={async () => {
                                    if (operationSubmitted) return;

                                    operationSubmitted = true;

                                    submitted = i;
                                    await $modalStore[0].meta.sendFriendRequest(profile.username, userId, profile.user_id, flash);
                                    submitted = null;
                                    $searchForFriendsQuery.refetch();

                                    operationSubmitted = false;
                                }} title="Send Friend Requests" class="h-fit text-[14px] variant-ghost-primary py-2 px-2" progressClass="w-[14px]">
                                    <Icon icon="pepicons-pop:plus" />
                                </Button>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
            {#if $searchForFriendsQuery.data?.length === 0}
                <p class="text-[18px]">No users found</p>
            {/if}
        </div>
        <div class="{search.length > 0 ? 'mt-[18px]' : ''}">
            {#if $searchForFriendsQuery.isLoading}
                <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div class="placeholder animate-pulse h-[44px] w-full md:w-[150px]" />
                    <div class="placeholder animate-pulse h-[38px] w-[110px]" />
                </div>
            {:else if paginationSettings.size > 0 }
                <Paginator
                    bind:settings={paginationSettings}
                    showFirstLastButtons="{true}"
	                showPreviousNextButtons="{true}"
                    amountText="Users"
                    select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
                    controlVariant="bg-surface-500 border border-solid border-gray-600"
                />
            {/if}
        </div>
    </div>
{/if}
