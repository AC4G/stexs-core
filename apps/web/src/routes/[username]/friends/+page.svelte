<script lang="ts">
    import { Avatar } from "ui";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { user } from "$lib/stores/user";
    import { Paginator, type PaginationSettings } from "@skeletonlabs/skeleton";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { profile } from "$lib/stores/profile";
    import { Search } from "flowbite-svelte";
    import Truncated from "ui/src/Truncated.svelte";

    let search: string = '';
    let previousSearch: string = '';
    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50,
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };

    $: paginationSettings.size = $profile?.totalFriends!;

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
                `, { count: 'exact', head: true })
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

        data.sort((a: { 
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
        queryKey: ['friends', $profile?.userId, paginationSettings.page, paginationSettings.limit],
        queryFn: async () => await fetchFriends($profile?.userId!, search, paginationSettings.page, paginationSettings.limit),
        enabled: !!$profile?.userId
    });
</script>

{#if $profile && $profile.totalFriends > 0}
    <div class="mb-[12px] md:max-w-[220px]">
        <Search size="lg" placeholder="Username" bind:value={search} class="!bg-surface-500" />
    </div>
{/if}
<div class="grid gap-4 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#if $friendsQuery.isLoading}
        {#each Array(20) as _}
            <div class="flex h-full w-full items-center justify-between">
                <div class="placeholder-circle animate-pulse w-[40px] h-[40px]" />
                <div class="placeholder animate-pulse w-[70%]" />
            </div>
        {/each}
    {:else}
        {#if $friendsQuery.data.length > 0}
            {#each $friendsQuery.data as friend}
                <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-between p-2 rounded-md hover:bg-surface-500 transition">
                    <Avatar class="w-[40px] h-[40px]" userId={friend.profiles.user_id} username={friend.profiles.username} endpoint={PUBLIC_S3_ENDPOINT} />
                    <Truncated text={friend.profiles.username} maxLength={12} class="text-[14px] w-[70%] text-left pl-2" />
                </a>
            {/each}
        {:else if $profile && $profile.totalFriends > 0 && search.length > 0}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">No friends found</p>
            </div>
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$user?.id === $profile?.userId ? 'You have no friends' : 'User has no friends'}</p>
            </div>
        {/if}
    {/if}
</div>
{#if $profile && $profile.totalFriends > 0}
    <div class="mx-auto mt-[12px]">
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{false}"
            showPreviousNextButtons="{true}"
            showNumerals
            amountText="Friends"
            select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
            controlVariant="bg-surface-500 border border-solid border-gray-600"
        />
    </div>
{/if}
