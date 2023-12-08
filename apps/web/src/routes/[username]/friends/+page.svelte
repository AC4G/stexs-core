<script lang="ts">
    import { Avatar } from "ui";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { user } from "$lib/stores/user";
    import { Paginator, type PaginationSettings } from "@skeletonlabs/skeleton";
    import { useQuery } from "@sveltestack/svelte-query";
    import { stexs } from "../../../stexsClient";
    import { profile } from "$lib/stores/profile";
    import { Search } from "flowbite-svelte";
    import type { Friend } from "$lib/types";
    import Truncated from "ui/src/Truncated.svelte";

    let friendsSearch: string = '';
    let filteredFriends: Friend[] = [];

    async function fetchFriends(userId: string) {
        const { data } = await stexs.from('friends').select('profiles!friends_friend_id_fkey(user_id,username)').eq('user_id', userId);
        return data;
    }

    $: friendsQuery = useQuery({
        queryKey: ['friends', $profile?.userId],
        queryFn: async () => await fetchFriends($profile?.userId!),
        enabled: !!$profile?.userId && ($profile.isPrivate === false || $profile.isFriend)
    });

    $: filteredFriends = $friendsQuery.data
        ? $friendsQuery.data.filter((friend: Friend) =>
            friend.profiles.username.toLowerCase().includes(friendsSearch.toLowerCase())
          )
        : [];

    let paginationSettings: PaginationSettings = {
        page: 0,
        limit: 50,
        size: 0,
        amounts: [50, 100, 250, 500, 1000],
    };

    $: paginationSettings.size = filteredFriends.length;

    $: paginatedFriendRequests = filteredFriends.slice(
        paginationSettings.page * paginationSettings.limit,
        paginationSettings.page * paginationSettings.limit + paginationSettings.limit
    );
</script>

{#if $friendsQuery.data && $friendsQuery.data.length > 0}
    <div class="mb-[12px] max-w-[220px]">
        <Search size="lg" placeholder="Username" bind:value={friendsSearch} class="!bg-surface-500" />
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
        {#if $friendsQuery.data && $friendsQuery.data.length > 0}
            {#each paginatedFriendRequests as friend}
                <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-between p-2 rounded-md hover:bg-surface-500 transition">
                    <Avatar class="w-[40px] h-[40px]" userId={friend.profiles.user_id} username={friend.profiles.username} endpoint={PUBLIC_S3_ENDPOINT} />
                    <Truncated text={friend.profiles.username} maxLength={12} class="text-[14px] w-[70%] text-left pl-2" />
                </a>
            {/each}
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$user?.id === $profile?.userId ? 'You have no friends' : 'User has no friends'}</p>
            </div>
        {/if}
    {/if}
</div>
{#if $friendsQuery.data && $friendsQuery.data.length > 0}
    <div class="w-fit md:w-full mx-auto mt-[12px]">
        <Paginator
            bind:settings={paginationSettings}
            showFirstLastButtons="{false}"
            showPreviousNextButtons="{true}"
            showNumerals
            amountText="Friends"
            controlVariant="bg-surface-700 border border-solid border-surface-500"
        />
    </div>
{/if}
