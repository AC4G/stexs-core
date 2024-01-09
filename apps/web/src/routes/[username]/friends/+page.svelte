<script lang="ts">
    import { Avatar, Button } from "ui";
    import { getUserStore } from "$lib/stores/user";
    import { Paginator, type PaginationSettings, getModalStore } from "@skeletonlabs/skeleton";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { getProfileStore } from "$lib/stores/profile";
    import { Dropdown, DropdownItem, Search } from "flowbite-svelte";
    import Icon from "@iconify/svelte";
    import { removeFriend } from "$lib/utils/friend";
    import { getFlash } from "sveltekit-flash-message";
    import { page } from "$app/stores";
    import { blockUserModal } from "$lib/utils/modals/userModals";

    const flash = getFlash(page);
    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const modalStore = getModalStore();
    let search: string = '';
    let previousSearch: string = '';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50, 
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };
    let removeFriendSubmitted: boolean = false;

    $: paginationSettings.size = $profileStore?.totalFriends!;

    async function fetchFriends(userId: string, search: string, page: number, limit: number) {
        if (search !== previousSearch) {
            paginationSettings.page = 0;
            page = 0;

            const { count } = await stexs.from('friends')
                .select(`
                    profiles!friends_friend_id_fkey(
                        user_id,
                        username
                    )
                `, { 
                    count: 'exact', 
                    head: true 
                })
                .eq('user_id', userId)
                .ilike('profiles.username', `%${search}%`)
                .not('profiles', 'is', null);

            paginationSettings.size = count;
            previousSearch = search;
        }

        const start = page * limit;
        const end = start + limit - 1;

        const { data } = await stexs.from('friends')
            .select(`
                id,
                profiles!friends_friend_id_fkey(
                    user_id,
                    username
                )
            `)
            .eq('user_id', userId)
            .ilike('profiles.username', `%${search}%`)
            .order('profiles(username)', { ascending: true })
            .not('profiles', 'is', null)
            .range(start, end);

        return data;
    }

    $: friendsQuery = useQuery({
        queryKey: ['friends', $profileStore?.userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => await fetchFriends($profileStore?.userId!, search, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profileStore?.userId
    });

    $: friendsLoaded = $profileStore && 
        ($profileStore.totalFriends > 0 && search.length > 0 ||
        $profileStore.totalFriends > 0) ||
        $friendsQuery.isLoading || !$friendsQuery.data;
</script>

<div class="flex flex-row justify-between {friendsLoaded ? 'mb-[18px]' : ''} items-center space-y-0">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        <div class="placeholder animate-pulse max-w-[220px] w-full h-[44px] rounded-lg" />
    {:else if $profileStore && $profileStore.totalFriends > 0}
        <div class="md:max-w-[220px]">
            <Search size="lg" placeholder="Username" bind:value={search} class="!bg-surface-500" />
        </div>
    {/if}
    {#if $userStore?.id === $profileStore?.userId}
        <Button title="Add Friend" class="variant-ghost-primary p-3 h-fit">
            <Icon icon="pepicons-pop:plus" />
        </Button>
    {/if}
</div>
<div class="grid gap-2 place-items-center grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
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
                            <DropdownItem on:click={() => blockUserModal(friend.profiles.user_id, $userStore.id, friend.profiles.username, flash, modalStore)} class="hover:!bg-surface-500 rounded transition text-red-600">Block</DropdownItem>
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
<div class="mx-auto {friendsLoaded ? 'mt-[18px]' : ''}">
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
