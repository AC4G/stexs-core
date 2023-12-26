<script lang="ts">
    import { Avatar } from "ui";
    import { getUserStore } from "$lib/stores/user";
    import { Paginator, type PaginationSettings } from "@skeletonlabs/skeleton";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { getProfileStore } from "$lib/stores/profile";
    import { Search } from "flowbite-svelte";
    import { Truncated } from "ui";

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
            .not('profiles', 'is', null)
            .range(start, end);

        data?.sort((a: { 
            profiles: {
                username: string
            } }, b: {
            profiles: {
                username: string
            }
        }) => {
            const usernameA = a.profiles.username;
            const usernameB = b.profiles.username;

            return usernameA.localeCompare(usernameB, undefined, { sensitivity: 'base' });
        });

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

<div class="{friendsLoaded ? 'mb-[18px]' : ''} md:max-w-[220px]">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        <div class="placeholder animate-pulse max-w-[220px] w-full h-[44px] rounded-lg" />
    {:else if $profileStore && $profileStore.totalFriends > 0}
        <div class="mb-[18px] md:max-w-[220px]">
            <Search size="lg" placeholder="Username" bind:value={search} class="!bg-surface-500" />
        </div>
    {/if}
</div>
<div class="grid gap-3 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $friendsQuery.isLoading || !$friendsQuery.data}
        {#each Array(50) as _}
            <div class="flex h-full w-full items-center justify-between">
                <div class="placeholder-circle animate-pulse w-[40px] h-[40px]" />
                <div class="placeholder animate-pulse w-[70%]" />
            </div>
        {/each}
    {:else}
        {#if $friendsQuery.data?.length > 0}
            {#each $friendsQuery.data as friend (friend.profiles.user_id)}
                <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-between p-2 rounded-md hover:bg-surface-500 transition">
                    <Avatar class="w-[40px] h-[40px]" userId={friend.profiles.user_id} username={friend.profiles.username} {stexs} />
                    <Truncated text={friend.profiles.username} maxLength={12} class="text-[14px] w-[70%] text-left pl-2" />
                </a>
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
            <div class="placeholder animate-pulse h-[38px] w-[120px]" />
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
