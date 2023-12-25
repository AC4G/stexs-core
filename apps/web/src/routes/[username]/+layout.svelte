<script lang="ts">
    import { page } from "$app/stores";
    import { Avatar, Button } from "ui";
    import { getUserStore } from "$lib/stores/user";
    import { stexs } from "../../stexsClient";
    import { useQuery } from '@sveltestack/svelte-query'
    import { TabAnchor, TabGroup, getModalStore, type ModalSettings } from "@skeletonlabs/skeleton";
    import { goto } from "$app/navigation";
    import { getFlash } from "sveltekit-flash-message/client";
    import Icon from '@iconify/svelte';
    import { Dropdown, DropdownItem } from "flowbite-svelte";
    import { acceptFriendRequest, deleteFriendRequest } from "$lib/utils/friendRequests";
    import { getProfileStore } from "$lib/stores/profile";
    
    const profileStore = getProfileStore();
    const userStore = getUserStore();
    const isSSR = import.meta.env.SSR;
    const modalStore = getModalStore();
    const flash = getFlash(page);
    let friendRequestSubmitted: boolean = false;
    let friendRequestRevocationSubmitted: boolean = false;
    let removeFriendSubmitted: boolean = false;
    let acceptFriendRequestSubmitted: boolean = false;
    let deleteFriendRequestSubmitted: boolean = false;
    $: username = $page.params.username;
    $: path = $page.url.pathname;

    async function fetchProfile(username: string) {
        const { data } = await stexs.from('profiles')
            .select(`
                user_id,
                username,
                is_private
            `)
            .eq('username', username)
            .single();

        if (data?.length === 0 && username !== undefined) {
            $flash = {
                message: 'User not found.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
            
            return goto('/');
        }

        return data;
    }

    async function fetchBlocked(userId: string, currentUserId: string) {
        const filters = `and(blocker_id.eq.${userId},blocked_id.eq.${currentUserId}),and(blocker_id.eq.${currentUserId},blocked_id.eq.${userId})`;

        const { data } = await stexs
            .from('blocked')
            .select('blocker_id')
            .or(filters);

        return data;
    }

    async function fetchIsFriend(userId: string, friendId: string) {
        const { data } = await stexs.from('friends')
            .select('friend_id')
            .eq('user_id', userId)
            .eq('friend_id', friendId);

        return { 
            result: data.length === 1 
        };
    }

    async function fetchFriendsAmount(userId: string) {
        const { count } = await stexs.from('friends')
            .select('id', { 
                count: 'exact',
                head: true 
            })
            .eq('user_id', userId);

        return count;
    }

    async function fetchFriendRequest(requesterId: string, addresseeId: string) {
        const { data } = await stexs.from('friend_requests')
            .select('id')
            .eq('requester_id', requesterId)
            .eq('addressee_id', addresseeId);

        return data.length > 0;
    }

    async function makeUserFriend(username: string, user_id: string, friend_id: string) {
        const { error } = await stexs.from('friends')
            .insert([
                { user_id, friend_id }
            ]);

        if (error) {
            $flash = {
                message: `Could not add ${username} as a friend. Try out again.`,
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            isFriend = true;
            $flash = {
                message: `${username} is now your friend.`,
                classes: 'variant-ghost-success',
                timeout: 5000,
            };
        }
    }

    async function sendFriendRequest(username: string, requester_id: string, addressee_id: string) {
        friendRequestSubmitted = true;
        const { error } = await stexs.from('friend_requests')
            .insert([
                { requester_id, addressee_id }
            ]);

        if (error && error.code === '23505') {
            await makeUserFriend(username, requester_id, addressee_id);
        } else if (error) {
            $flash = {
                message: 'Could not send friend request. Try out again.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            friendRequestSend = true;
            $flash = {
                message: 'Friend request successfully send.',
                classes: 'variant-ghost-success',
                timeout: 5000,
            };
        }

        friendRequestSubmitted = false;
    }

    async function revokeFriendRequest(params: { requesterId: string, addresseeId: string }) {
        friendRequestRevocationSubmitted = true;
        const { requesterId, addresseeId } = params;
        const { error } = await stexs.from('friend_requests')
            .delete()
            .eq('requester_id', requesterId)
            .eq('addressee_id', addresseeId);

        if (error) {
            $flash = {
                message: 'Could not revoke friend request. Try out again.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            friendRequestSend = false;
            $flash = {
                message: 'Friend request successfully revoked.',
                classes: 'variant-ghost-success',
                timeout: 5000,
            };
        }

        friendRequestRevocationSubmitted = false;
    }

    function revokeFriendRequestModal(requesterId: string, addresseeId: string) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'confirm',
            meta: {
                text: 'Do you really want to revoke the friend request?',
                function: revokeFriendRequest,
                fnParams: {
                    requesterId,
                    addresseeId
                },
                fnAsync: true
            }
        };
        modalStore.set([modal]);
    }

    async function removeFriend(params: { userId: string, friendId: string }) {
        removeFriendSubmitted = true;
        const { userId, friendId } = params;
        const { error } = await stexs.from('friends')
            .delete()
            .eq('user_id', userId)
            .eq('friend_id', friendId);

        if (error) {
            $flash = {
                message: 'Could not remove friend. Try out again.',
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            isFriend = false;
            $flash = {
                message: 'Friend successfully removed.',
                classes: 'variant-ghost-success',
                timeout: 5000,
            };
        }

        removeFriendSubmitted = false;
    }

    function removeFriendModal(username: string, userId: string, friendId: string) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'confirm',
            meta: {
                text: `Do you really want to remove ${username} as your friend?`,
                function: removeFriend,
                fnParams: {
                    userId,
                    friendId
                },
                fnAsync: true
            }
        };
        modalStore.set([modal]);
    }

    async function blockUser(params: { blocked_id: string, blocker_id: string, username: string }) {
        const { blocked_id, blocker_id, username } = params;
        const { error } = await stexs.from('blocked')
            .insert([
                { blocker_id, blocked_id }
            ]);

        if (error) {
            $flash = {
                message: `Could not block ${username}. Try out again.`,
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            location.reload();
        }
    }

    function blockUserModal(userId: string, currentUserId: string, username: string) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'confirm',
            meta: {
                text: `Do you really want to block ${username}?`,
                function: blockUser,
                fnParams: {
                    blocked_id: userId,
                    blocker_id: currentUserId,
                    username
                },
                fnAsync: true
            }
        };
        modalStore.set([modal]);
    }

    async function unblockUser(params: { userId: string, currentUserId: string, username: string }) {
        const { userId, currentUserId, username } = params;
        const { error } = await stexs.from('blocked')
            .delete()
            .eq('blocked_id', userId)
            .eq('blocker_id', currentUserId);

        if (error) {
            $flash = {
                message: `Could not unblock ${username}. Try out again.`,
                classes: 'variant-ghost-error',
                timeout: 5000,
            };
        } else {
            location.reload();
        }
    }

    function unblockUserModal(userId: string, currentUserId: string, username: string) {
        const modal: ModalSettings = {
            type: 'component',
            component: 'confirm',
            meta: {
                text: `Do you really want to unblock ${username}?`,
                function: unblockUser,
                fnParams: {
                    userId,
                    currentUserId,
                    username
                },
                fnAsync: true
            }
        };
        modalStore.set([modal]);
    }

    $: profileQuery = useQuery({
        queryKey: ['userProfile', username],
        queryFn: async () => await fetchProfile(username),
        enabled: !!username && !isSSR
    });

    $: blockedQuery = useQuery({
        queryKey: ['blockedProfile', $userStore?.id, userId],
        queryFn: async () => await fetchBlocked(userId, $userStore?.id!),
        enabled: !!$userStore?.id && !!userId && userId !== $userStore.id
    });

    $: isCurrentUserBlocker = $blockedQuery.data?.filter((blocked: { blocker_id: string }) => blocked.blocker_id === $userStore?.id).length > 0;

    $: isFriendQuery = useQuery({
        queryKey: ['isFriend', $userStore?.id, $profileStore?.refetchTrigger],
        queryFn: async () => await fetchIsFriend($userStore?.id!, userId),
        enabled: !!$userStore?.id && !!userId && userId !== $userStore.id && !!$blockedQuery.data && $blockedQuery.data.length === 0
    });

    $: isFriend = $isFriendQuery.data?.result as boolean;
    $: userId = $profileQuery.data?.user_id;
    $: isPrivate = $profileQuery.data?.is_private as boolean;

    $: friendsAmountQuery = useQuery({
        queryKey: ['friendsAmount', userId],
        queryFn: async () => await fetchFriendsAmount(userId),
        enabled: !!userId && ((!isPrivate && $blockedQuery.data?.length === 0) || !!isFriend || userId === $userStore?.id)
    });

    $: totalFriends = $friendsAmountQuery.data ?? 0;

    $: gotFriendRequestQuery = useQuery({
        queryKey: ['gotFriendRequest', userId, $userStore?.id],
        queryFn: async () => await fetchFriendRequest(userId, $userStore?.id!),
        enabled: !!userId && !!$userStore?.id && !isFriend
    });
    
    $: gotFriendRequest = $gotFriendRequestQuery.data;

    $: friendRequestQuery = useQuery({
        queryKey: ['profileFriendRequest', userId, $userStore?.id],
        queryFn: async () => fetchFriendRequest($userStore?.id!, userId),
        enabled: !!userId && !!$userStore && userId !== $userStore.id && !isFriend && !gotFriendRequest
    });

    $: friendRequestSend = $friendRequestQuery.data;

    $: profileStore.set({
        userId,
        isPrivate,
        isFriend,
        totalFriends
    });
</script>

<div class="w-screen h-screen bg-no-repeat bg-top">
    <div class="grid place-items-center">
        <div class="rounded-md py-8 px-4 sm:px-8 bg-surface-600 bg-opacity-60 backdrop-blur-sm border-surface-800 border max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg w-full mt-[40px]">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 gap-y-8">
                {#if $profileQuery.isLoading || !$profileQuery.data}
                    <div class="placeholder-circle animate-pulse mx-auto w-[120px] sm:w-[148px]" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <div class="placeholder animate-pulse w-[120px] h-[20px]" />
                        <div class="placeholder animate-pulse w-[100px] h-[20px]" />
                    </div>
                {:else}
                    <Avatar {userId} {stexs} {username} class="mx-auto w-[120px] sm:w-[148px]" draggable="false" />
                    <div class="grid grid-rows-3 gap-y-4 sm:gap-0 sm:pt-[12px] pl-4 sm:pl-[12px]">
                        <p class="text-[20px] w-fit">{$profileQuery.data?.username}</p>
                        {#if (!isPrivate || $userStore?.id === userId || isFriend) && ($blockedQuery.data === undefined || $blockedQuery.data.length === 0)}
                            {#if $friendsAmountQuery.isLoading}
                                <div class="placeholder animate-pulse w-[100px] h-[20px]" />
                            {:else}
                                <p class="text-[18px]">Friends {$friendsAmountQuery.data ?? 0}</p>
                            {/if}
                        {/if}
                    </div>
                {/if}
                {#if $userStore && $profileQuery.data && $userStore.id !== $profileQuery.data.user_id}
                    <div class="grid pt-[12px] sm:col-start-3 col-span-full">
                        <div class="flex justify-between sm:justify-end">
                            {#if $blockedQuery.data?.length === 0}
                                {#if isFriend}
                                    <Button on:click={() => removeFriendModal(username, $userStore.id, userId)} submitted={removeFriendSubmitted} class="h-fit text-[14px] bg-surface-800 py-1 px-2 border border-solid border-surface-500 text-red-600">Remove Friend</Button>
                                {:else if gotFriendRequest}
                                    <div class="flex flex-col mr-2">
                                        <p class="col-span-2">Friend Request:</p>
                                        <div class="flex flex-row mt-[4px] space-x-2">
                                            <Button on:click={async () => {
                                                acceptFriendRequestSubmitted = true;

                                                isFriend = await acceptFriendRequest($userStore.id, userId, username, flash, profileStore);

                                                if (isFriend) gotFriendRequest = false;

                                                acceptFriendRequestSubmitted = false;
                                            }} submitted={acceptFriendRequestSubmitted} class="variant-filled-primary py-1 px-2">Accept</Button>
                                            <Button on:click={async () => {
                                                deleteFriendRequestSubmitted = true;

                                                gotFriendRequest = await deleteFriendRequest(userId, $userStore.id, flash);
                                                
                                                deleteFriendRequestSubmitted = false;
                                            }} submitted={deleteFriendRequestSubmitted} loaderMeter="stroke-red-500" loaderTrack="stroke-red-500/20" class="h-fit text-[14px] bg-surface-800 py-1 px-2 border border-solid border-surface-500 text-red-600">Delete</Button>
                                        </div>
                                    </div>
                                {:else if friendRequestSend}
                                    <Button on:click={() => revokeFriendRequestModal($userStore.id, userId)} submitted={friendRequestRevocationSubmitted} class="h-fit text-[14px] bg-surface-800 py-1 px-2 border border-solid border-surface-500 text-red-600">Revoke Friend Request</Button>
                                {:else}
                                    <Button on:click={async () => await sendFriendRequest(username, $userStore.id, userId)} submitted={friendRequestSubmitted} class="h-fit text-[14px] variant-filled-primary py-1 px-2">Send Friend Request</Button>
                                {/if}
                            {/if}
                            <Button class="w-fit h-fit p-1 group">
                                <Icon icon="pepicons-pop:dots-y" class="text-[26px] group-hover:text-surface-400 transition" />
                            </Button>
                            <Dropdown class="absolute right-[-6px] rounded-md bg-surface-900 p-2 space-y-2 border border-solid border-surface-500">
                                <DropdownItem class="hover:!bg-surface-500 rounded transition text-red-600">Report</DropdownItem>
                                {#if isCurrentUserBlocker}
                                    <DropdownItem on:click={() => unblockUserModal(userId, $userStore.id, username)} class="hover:!bg-surface-500 rounded transition text-primary-500">Unblock</DropdownItem>
                                {:else}
                                    <DropdownItem on:click={() => blockUserModal(userId, $userStore?.id, username)} class="hover:!bg-surface-500 rounded transition text-red-600">Block</DropdownItem>
                                {/if}
                            </Dropdown>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="grid grid-rows-1 mt-[28px]">
                {#if $blockedQuery.data?.length > 0}
                    <div class="grid row-start-2 col-span-full place-items-center bg-surface-800 rounded-md py-10">
                        <p class="text-[20px] text-center">
                            {#if isCurrentUserBlocker}
                                Blocked
                            {:else}
                                User blocked you
                            {/if}
                        </p>
                    </div>
                {:else}
                    {#if $profileQuery.isLoading && !$profileQuery.data}
                        <div class="placeholder animate-pulse rounded-md h-[140px] col-span-full" />
                    {:else if !$profileQuery.data?.is_private || $userStore?.id === userId || isFriend}
                        <TabGroup active="variant-filled-primary" border="border-none" hover="hover:bg-surface-500" class="row-start-2 col-span-full bg-surface-800 rounded-md p-4" justify="justify-center" rounded="rounded-md">
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
                                <slot/>
                            </svelte:fragment>
                        </TabGroup>
                    {:else}
                        <div class="grid row-start-2 col-span-full place-items-center bg-surface-800 rounded-md py-10">
                            <p class="text-[20px] text-center">User is private</p>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
</div>
