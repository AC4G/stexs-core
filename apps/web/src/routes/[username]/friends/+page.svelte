<script lang="ts">
    import type { UseQueryStoreResult } from "@sveltestack/svelte-query";
    import { getContext } from "svelte";
    import { Avatar } from "ui";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { user } from "$lib/stores/user";

    let { userId, friendsQuery }: { userId: string, friendsQuery: UseQueryStoreResult<any, unknown, any, string[]> } = getContext('profile');
</script>

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
            {#each $friendsQuery.data as friend}
                <a href="/{friend.profiles.username}" class="flex h-full w-full items-center justify-between p-2 rounded-md hover:bg-surface-500 transition">
                    <Avatar class="w-[40px] h-[40px]" userId={friend.profiles.user_id} username={friend.profiles.username} endpoint={PUBLIC_S3_ENDPOINT} />
                    <p class="text-[18px] w-[70%] text-left">{friend.profiles.username}</p>
                </a>
            {/each}
        {:else}
            <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
                <p class="text-[18px] p-4 text-center">{$user?.id === userId ? 'You have no friends' : 'User has no friends'}</p>
            </div>
        {/if}
    {/if}
</div>
