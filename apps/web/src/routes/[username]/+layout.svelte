<script lang="ts">
    import { page } from "$app/stores";
    import { Avatar, Button } from "ui";
    import { user } from "$lib/stores/user";
    import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
    import { stexs } from "../../stexsClient";
    import { useQuery } from '@sveltestack/svelte-query'
    import { TabAnchor, TabGroup } from "@skeletonlabs/skeleton";
    import { goto } from "$app/navigation";
    import { getFlash } from "sveltekit-flash-message/client";
    import { setContext } from "svelte";
    
    const flash = getFlash(page);
    $: username = $page.params.username;
    $: path = $page.url.pathname;

    async function fetchProfile(username: string) {
        const { data } = await stexs.from('profiles').select('user_id,username,is_private').eq('username', username);

        if (data.length === 0 && username !== undefined) {
            $flash = {
                message: 'User or account not found.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
            return goto('/');
        }

        return data[0];
    }

    async function fetchIsFriend(userId: string) {
        const { data } = await stexs.from('friends').select('friend_id').eq('user_id', userId);
        return data.length === 1;
    }

    async function fetchFriends(userId: string) {
        const { data } = await stexs.from('friends').select('profiles!friends_user_id_fkey(user_id,username)').eq('user_id', userId);
        return data;
    }

    $: profileQuery = useQuery({
        queryKey: ['userProfile', username],
        queryFn: async () => await fetchProfile(username),
        enabled: !!username
    });

    $: isFriendQuery = useQuery({
        queryKey: ['isFriend', $user?.id],
        queryFn: async () => await fetchIsFriend($user?.id!),
        enabled: !!$user?.id
    });

    $: isFriend = $isFriendQuery.data;
    $: userId = $profileQuery.data?.user_id;
    $: isPrivate = $profileQuery.data?.is_private;

    $: friendsQuery = useQuery({
        queryKey: ['friends', userId],
        queryFn: async () => await fetchFriends(userId),
        enabled: !!userId && (isPrivate === false || !!isFriend)
    });

    $: setContext('profile', { userId, isPrivate, isFriend });
</script>

<div class="w-screen h-screen bg-no-repeat bg-top bg-[url('https://cdn.cloudflare.steamstatic.com/steam/clusters/sale_autumn2019_assets/54b5034d397baccb93181cc6/home_header_bg_rainy_english.gif?t=1700618391')]">
    <div class="grid place-items-center">
        <div class="rounded-md py-8 px-4 sm:px-8 bg-surface-600 bg-opacity-60 backdrop-blur-sm border-surface-800 border max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg w-full mt-[40px]">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 gap-y-8">
                {#if $profileQuery.isLoading}
                    <div class="placeholder-circle animate-pulse w-[148px]" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <div class="placeholder animate-pulse w-[120px] h-[20px]" />
                        <div class="placeholder animate-pulse w-[100px] h-[20px]" />
                    </div>
                {:else}
                    <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={$profileQuery.data?.user_id} {username} class="mx-auto w-[120px] sm:w-[148px]" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <p class="text-[20px]">{$profileQuery.data?.username}</p>
                        {#if !$profileQuery.data?.is_private || $user?.id === $profileQuery.data?.user_id}
                            {#if $friendsQuery.isLoading}
                                <div class="placeholder animate-pulse w-[100px] h-[20px]" />
                            {:else}
                                <p class="text-[18px]">Friends {$friendsQuery.data?.length}</p>
                            {/if}
                        {/if}
                        {#if $user && $user.id !== $profileQuery.data?.user_id}
                            {#if $isFriendQuery.isLoading}
                                <div class="placeholder animate-pulse w-[120px] h-[20px]" />
                            {:else} 
                                {#if !$isFriendQuery.data}
                                    <Button class="variant-filled-primary text-[18px] w-fit">Send Friend Request</Button>
                                {/if}
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>
            <div class="grid grid-rows-1 mt-[28px]">
                {#if $profileQuery.isLoading}
                    <div class="placeholder animate-pulse rounded-md h-[140px] col-span-full" />
                {:else if !$profileQuery.data?.is_private}
                    <TabGroup active="variant-filled-primary" border="border-b-2 border-surface-500" hover="hover:bg-surface-500" class="row-start-2 col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5 bg-surface-800 rounded-md p-4" justify="justify-center">
                        <TabAnchor href="/{username}" selected={path === `/${username}`} >
                            <span>Inventory</span>
                        </TabAnchor>
                        <TabAnchor href="/{username}/friends" selected={path.endsWith('/friends')} >
                            <span>Friends</span>
                        </TabAnchor>
                        <TabAnchor href="/{username}/organizations" selected={path.endsWith('/organizations')} >
                            <span>Organizations</span>
                        </TabAnchor>
                        <svelte:fragment slot="panel">
                            <slot {userId} {isPrivate} {isFriend} />
                        </svelte:fragment>
                    </TabGroup>
                {:else}
                    <div class="grid row-start-2 col-span-full place-items-center bg-surface-800 rounded-md py-10">
                        <p class="text-[22px] variant-ghost-tertiary p-4 rounded-md text-center">User is private</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
