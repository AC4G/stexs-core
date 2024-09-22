<script lang="ts">
    import { Avatar, Button } from "ui";
    import { getUserStore } from "$lib/stores/userStore";
    import { 
        Paginator, 
        type PaginationSettings, 
        getModalStore, 
        ListBoxItem, 
        popup, 
        type PopupSettings 
    } from "@skeletonlabs/skeleton";
    import { createQuery } from "@tanstack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { getProfileStore } from "$lib/stores/profileStore";
    import { Dropdown, DropdownItem, Search } from "flowbite-svelte";
    import Icon from "@iconify/svelte";
    import { removeFriend } from "$lib/utils/friend";
    import { getFlash } from "sveltekit-flash-message";
    import { page } from "$app/stores";
    import { openBlockUserModal } from "$lib/utils/modals/userModals";
    import { openAddFriendModal } from "$lib/utils/modals/friendModals";
    import { debounce } from "lodash";

    const flash = getFlash(page);
    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    const addFriendProfilePopup: PopupSettings = {
        event: 'hover',
        target: 'addFriendProfilePopup',
        placement: 'top'
    };
    let openDropDown: { [key: string]: boolean } = {};

    let search: string = '';
    let previousSearch: string = '';
    let filter: string = 'A-Z';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 20, 
        size: 0,
        amounts: [20, 50, 100],
    };
    let removeFriendSubmitted: boolean = false;
    let previousLimit: number | undefined;

    $: paginationSettings.size = $profileStore?.totalFriends || 0;

    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 300);

    async function fetchFriends(userId: string, search: string, filter: string, page: number, limit: number) {
        openDropDown = {};

        if ($profileStore) {
            $profileStore.refetchFriendsFn();

            if ($userStore && $profileStore.userId !== $userStore.id && !$profileStore.isFriend) {
                $profileStore.refetchIsFriendFn();
            }
        }

        if (!previousLimit) previousLimit = limit;

        if (search !== previousSearch || previousLimit !== limit) {
            paginationSettings.limit = limit;
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

    $: friendsQuery = createQuery({
        queryKey: ['friends', $profileStore?.userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => await fetchFriends($profileStore?.userId!, search, filter, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });
</script>

<div class="flex flex-col xs:flex-row justify-between mb-[18px] space-y-2 xs:space-y-0 xs:space-x-2 items-center">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        <div class="placeholder animate-pulse xs:max-w-[300px] w-full h-[41.75px] rounded-lg" />
        <div class="placeholder animate-pulse xs:w-[90px] w-full h-[41.75px] rounded-lg" />
    {:else if $profileStore && $profileStore.totalFriends > 0}
        <div class="flex flex-col xs:flex-row w-full justify-between xs:space-x-2 space-y-2 xs:space-y-0 items-center">
            <div class="xs:max-w-[300px] w-full">
                <Search size="md" placeholder="Search by Username..." on:input={handleSearch} class="!bg-surface-500" />
            </div>
            <div class="xs:w-fit w-full">
                <Button class="bg-surface-500 border border-gray-600 w-full xs:w-fit py-[8px]">{filter}<Icon
                    icon="iconamoon:arrow-down-2-duotone"
                    class="text-[22px]"
                    /></Button>
                <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500">
                    <ListBoxItem bind:group={filter} name="filter" value={'A-Z'}>A-Z</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Z-A'}>Z-A</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Latest'}>Latest</ListBoxItem>
                    <ListBoxItem bind:group={filter} name="filter" value={'Oldest'}>Oldest</ListBoxItem>
                </Dropdown>
            </div>
        </div>
        {#if $userStore?.id === $profileStore?.userId}
            <button use:popup={addFriendProfilePopup} on:click={() => openAddFriendModal($userStore.id, flash, modalStore, stexs, () => {
                $profileStore?.refetchFriendsFn();
            })} class="relative btn variant-ghost-primary p-[12.89px] h-fit w-full xs:w-fit">
                <Icon icon="pepicons-pop:plus"/>
                <div class="p-2 variant-filled-surface rounded-md !ml-0" data-popup="addFriendProfilePopup">
                    <p class="text-[14px] break-all">Add Friends</p>
                </div>
            </button>
        {/if}
    {/if}
</div>
<div class="grid gap-3 place-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        {#each Array(20) as _}
            <div class="flex h-full w-full items-center justify-left space-x-2 p-2">
                <div class="placeholder-circle animate-pulse w-[40px] h-[40px]" />
                <div class="placeholder animate-pulse w-[70%]" />
            </div>
        {/each}
    {:else}
        {#if $friendsQuery.data?.length > 0}
            {#each $friendsQuery.data as friend (friend.id)}
                <div class="flex flex-row rounded-md transition items-center p-2 w-full bg-surface-700 border border-surface-600">
                    <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-left group">
                        <Avatar class="w-[40px] h-[40px] !bg-surface-800 border-2 border-surface-600 group-hover:border-primary-500 transition" userId={friend.profiles.user_id} username={friend.profiles.username} {stexs} />
                        <p class="text-[14px] w-[70%] text-left pl-2 break-all group-hover:text-secondary-400 transition">{friend.profiles.username}</p>
                    </a>
                    {#if $userStore?.id === $profileStore?.userId}
                        <Button class="w-fit h-fit p-1 group">
                            <Icon icon="pepicons-pop:dots-y" class="text-[26px] group-hover:text-surface-400 transition {openDropDown[friend.id] ? 'text-surface-400' : ''}" />
                        </Button>
                        <Dropdown bind:open={openDropDown[friend.id]} placement="left" class="rounded-md bg-surface-900 p-2 space-y-2 border border-surface-500">
                            <DropdownItem on:click={async () => {
                                removeFriendSubmitted = true;
                                await removeFriend($userStore.id, friend.profiles.user_id, flash);
                                removeFriendSubmitted = false;
                                
                                $profileStore?.refetchFriendsFn();
                            }} submitted={removeFriendSubmitted} class="hover:!bg-surface-500 rounded text-red-600 whitespace-nowrap">Remove Friend</DropdownItem>
                            <DropdownItem class="hover:!bg-surface-500 rounded text-red-600">Report</DropdownItem>
                            <DropdownItem on:click={() => openBlockUserModal(friend.profiles.user_id, $userStore.id, friend.profiles.username, flash, modalStore, () => {
                                $profileStore?.refetchFriendsFn();
                            })} class="hover:!bg-surface-500 rounded text-red-600">Block</DropdownItem>
                        </Dropdown>
                    {/if}
                </div>
            {/each}
        {:else if $profileStore && $profileStore.totalFriends > 0 && (search.length > 0 || $friendsQuery.data.length === 0)}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No friends found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full mb-[18px]">
                <p class="text-[18px] p-6 text-center">{$userStore?.id === $profileStore?.userId ? 'You have no friends' : 'User has no friends'}</p>
                {#if $userStore?.id === $profileStore?.userId}
                    <button use:popup={addFriendProfilePopup} on:click={() => openAddFriendModal($userStore.id, flash, modalStore, stexs, () => {
                        $profileStore?.refetchFriendsFn();
                    })} class="relative btn variant-filled-primary h-fit w-full sm:w-fit">
                        Add Friends
                    </button>
                {/if}
            </div>
        {/if}
    {/if}
</div>
{#if $friendsQuery.isLoading || !$friendsQuery.data}
    <div class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-[18px]">
        <div class="placeholder animate-pulse h-[42px] w-full md:w-[150px]" />
        <div class="placeholder animate-pulse h-[34px] w-full max-w-[230px]" />
    </div>
{:else if paginationSettings.size / paginationSettings.limit > 1 || paginationSettings.limit > 20 || $profileStore && $profileStore.totalFriends > 20 && search.length > 0 && $friendsQuery.data.length > 0}
    <div class="mt-[18px]">
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{true}"
            showPreviousNextButtons="{true}"
            amountText="Friends"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-gray-600 flex-wrap"
        />
    </div>
{/if}
