<script lang="ts">
    import { Avatar, Button } from "ui";
    import { getUserStore } from "$lib/stores/userStore";
    import { Paginator, type PaginationSettings, getModalStore, ListBoxItem } from "@skeletonlabs/skeleton";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { getProfileStore } from "$lib/stores/profileStore";
    import { Dropdown, DropdownItem, Search } from "flowbite-svelte";
    import Icon from "@iconify/svelte";
    import { removeFriend } from "$lib/utils/friend";
    import { getFlash } from "sveltekit-flash-message";
    import { page } from "$app/stores";
    import { openBlockUserModal } from "$lib/utils/modals/userModals";
    import { openAddFriendsModal } from "$lib/utils/modals/friendModals";
    import { debounce } from "lodash";

    const flash = getFlash(page);
    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    let search: string = '';
    let previousSearch: string = '';
    let filter: string = 'A-Z';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50, 
        size: 0,
        amounts: [50, 100],
    };
    let removeFriendSubmitted: boolean = false;

    $: paginationSettings.size = $profileStore?.totalFriends!;

    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    async function fetchFriends(userId: string, search: string, filter: string, page: number, limit: number) {
        if (search !== previousSearch) {
            paginationSettings.page = 0;
            page = 0;
            previousSearch = search;
        }

        const start = page * limit;
        const end = start + limit - 1;

        const query = stexs.from('friends')
            .select(`
                id,
                profiles!friends_friend_id_fkey(
                    user_id,
                    username
                ),
                created_at
            `, { count: 'exact' })
            .eq('user_id', userId)
            .ilike('profiles.username', `%${search}%`)
            .not('profiles', 'is', null)
            .range(start, end);

        if (filter === 'A-Z') query.order('profiles(username)', { ascending: true });

        if (filter === 'Z-A') query.order('profiles(username)', { ascending: false });

        if (filter === 'Latest') query.order('created_at', { ascending: false });

        if (filter === 'Oldest') query.order('created_at', { ascending: true });

        const { data, count } = await query;

        paginationSettings.size = count;

        return data;
    }

    $: friendsQuery = useQuery({
        queryKey: ['friends', $profileStore?.userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => await fetchFriends($profileStore?.userId!, search, filter, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });

    $: friendsLoaded = $profileStore && 
        ($profileStore.totalFriends > 0 && search.length > 0 ||
        $profileStore.totalFriends > 0) ||
        $friendsQuery.isLoading || !$friendsQuery.data;
</script>

<div class="flex flex-col sm:flex-row justify-between {friendsLoaded ? 'mb-[18px]' : ''} space-y-2 sm:space-y-0 sm:space-x-2">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        <div class="placeholder animate-pulse max-w-[220px] w-full h-[44px] rounded-lg" />
    {:else if $profileStore && $profileStore.totalFriends > 0}
        <div class="flex flex-col sm:flex-row w-full justify-between space-y-2 sm:space-y-0">
            <div class="sm:max-w-[220px]">
                <Search size="lg" placeholder="Username" on:input={handleSearch} class="!bg-surface-500" />
            </div>
            <div class="sm:w-fit">
                <Button class="bg-surface-500 border border-solid border-gray-600 w-full sm:w-fit py-[8px]">{filter}<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[22px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
                    <ListBoxItem bind:group={filter} name="filter" value={'A-Z'} class="transition">A-Z</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Z-A'} class="transition">Z-A</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Latest'} class="transition">Latest</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Oldest'} class="transition">Oldest</ListBoxItem>
                </Dropdown>
            </div>
        </div>
    {/if}
    {#if $userStore?.id === $profileStore?.userId}
        <Button on:click={() => openAddFriendsModal($userStore.id, flash, modalStore, stexs)} title="Add Friends" class="variant-ghost-primary p-[12.89px] h-fit">
            <Icon icon="pepicons-pop:plus" />
        </Button>
    {/if}
</div>
<div class="grid gap-2 place-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        {#each Array(50) as _}
            <div class="flex h-full w-full items-center justify-between">
                <div class="placeholder-circle animate-pulse w-[40px] h-[40px]" />
                <div class="placeholder animate-pulse w-[70%]" />
            </div>
        {/each}
    {:else}
        {#if $friendsQuery.data?.length > 0}
            {#each $friendsQuery.data as friend (friend.id)}
                <div class="flex flex-row rounded-md transition items-center p-2 w-full border border-solid border-surface-600">
                    <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-left group">
                        <Avatar class="w-[40px] h-[40px]" userId={friend.profiles.user_id} username={friend.profiles.username} {stexs} />
                        <p class="text-[14px] w-[70%] text-left pl-2 break-all group-hover:text-secondary-400 transition">{friend.profiles.username}</p>
                    </a>
                    {#if $userStore?.id === $profileStore?.userId}
                        <Button class="w-fit h-fit p-1 group">
                            <Icon icon="pepicons-pop:dots-y" class="text-[26px] group-hover:text-surface-400 transition" />
                        </Button>
                        <Dropdown placement="left" class="rounded-md bg-surface-900 p-2 space-y-2 border border-solid border-surface-500">
                            <DropdownItem on:click={async () => {
                                removeFriendSubmitted = true;
                                await removeFriend($userStore.id, friend.profiles.user_id, flash);
                                removeFriendSubmitted = false;
                                $friendsQuery.refetch();
                            }} submitted={removeFriendSubmitted} class="hover:!bg-surface-500 rounded transition text-red-600 whitespace-nowrap">Remove Friend</DropdownItem>
                            <DropdownItem class="hover:!bg-surface-500 rounded transition text-red-600">Report</DropdownItem>
                            <DropdownItem on:click={() => openBlockUserModal(friend.profiles.user_id, $userStore.id, friend.profiles.username, flash, modalStore)} class="hover:!bg-surface-500 rounded transition text-red-600">Block</DropdownItem>
                        </Dropdown>
                    {/if}
                </div>
            {/each}
        {:else if $profileStore && $profileStore.totalFriends > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No friends found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$userStore?.id === $profileStore?.userId ? 'You have no friends' : 'User has no friends'}</p>
            </div>
        {/if}
    {/if}
</div>
<div class="{friendsLoaded ? 'mt-[18px]' : ''}">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
            <div class="placeholder animate-pulse h-[44px] w-full md:w-[150px]" />
            <div class="placeholder animate-pulse h-[38px] w-[110px]" />
        </div>
    {:else if $profileStore && $profileStore.totalFriends > 0}
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{false}"
            showPreviousNextButtons="{true}"
            showNumerals
            amountText="Friends"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    {/if}
</div>
