<script lang="ts">
	import { run } from 'svelte/legacy';

	import { page } from '$app/stores';
	import { Avatar, Button, setToast } from 'ui';
	import { getUserStore } from '$lib/stores/userStore';
	import { stexs } from '../../stexsClient';
	import { createQuery } from '@tanstack/svelte-query';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { Dropdown, DropdownItem, P } from 'flowbite-svelte';
	import {
		acceptFriendRequest,
		deleteFriendRequest,
		removeFriend,
		revokeFriendRequest,
		sendFriendRequest,
	} from '$lib/utils/friend';
	import { getProfileStore } from '$lib/stores/profileStore';
	import type { Snippet } from 'svelte';
	
	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const profileStore = getProfileStore();
	const userStore = getUserStore();
	const isSSR = import.meta.env.SSR;
	let friendRequestSubmitted: boolean = $state(false);
	let friendRequestRevocationSubmitted: boolean = $state(false);
	let removeFriendSubmitted: boolean = $state(false);
	let acceptFriendRequestSubmitted: boolean = $state(false);
	let deleteFriendRequestSubmitted: boolean = $state(false);
	let profileDropDownOpen: boolean = $state(false);

	async function fetchProfile(username: string) {
		const { data } = await stexs
			.from('profiles')
			.select(
				`
					user_id,
					username,
					bio,
					url,
					is_private,
					accept_friend_requests
				`,
			)
			.ilike('username', username);

		if (data?.length === 0 && username !== undefined) {
			setToast({
				title: 'Error',
				type: 'error',
				description: 'User not found.',
				duration: 5000,
			});

			return goto('/');
		}

		return data[0];
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
		const { data } = await stexs
			.from('friends')
			.select('friend_id')
			.eq('user_id', userId)
			.eq('friend_id', friendId);

		return data.length === 1;
	}

	async function fetchFriendsAmount(userId: string) {
		const { count } = await stexs
			.from('friends')
			.select('', {
				count: 'exact',
				head: true,
			})
			.eq('user_id', userId);

		return count;
	}

	async function fetchFriendRequest(requesterId: string, addresseeId: string) {
		const { data } = await stexs
			.from('friend_requests')
			.select('id')
			.eq('requester_id', requesterId)
			.eq('addressee_id', addresseeId);

		return data.length > 0;
	}

	let username = $derived($page.params.username);
	let path = $derived($page.url.pathname);
	let profileQuery = $derived(createQuery({
		queryKey: ['userProfile', username],
		queryFn: async () => await fetchProfile(username),
		enabled: !!username && !isSSR,
	}));
	let userId = $derived($profileQuery.data?.user_id);
	let blockedQuery = $derived(createQuery({
		queryKey: ['blockedProfile', $userStore?.id, userId],
		queryFn: async () => await fetchBlocked(userId, $userStore?.id!),
		enabled: !!$userStore?.id && !!userId && userId !== $userStore.id,
	}));
	let isCurrentUserBlocker =
		$derived($blockedQuery.data?.filter(
			(blocked: { blocker_id: string }) =>
				blocked.blocker_id === $userStore?.id,
		).length > 0);
	let isFriendQuery = $derived(createQuery({
		queryKey: ['isFriend', $userStore?.id, userId],
		queryFn: async () => await fetchIsFriend($userStore?.id!, userId),
		enabled:
			!!$userStore?.id &&
			!!userId &&
			userId !== $userStore.id &&
			!!$blockedQuery.data &&
			$blockedQuery.data.length === 0,
	}));

	let isFriend = $derived($isFriendQuery.data);

	let isPrivate = $derived($profileQuery.data?.is_private as boolean);
	let friendsAmountQuery = $derived(createQuery({
		queryKey: ['friendsAmount', userId],
		queryFn: async () => await fetchFriendsAmount(userId),
		enabled:
			!!userId &&
			((!isPrivate && ($blockedQuery.data?.length === 0 || !$userStore)) ||
				!!isFriend ||
				userId === $userStore?.id),
	}));
	let totalFriends = $derived($friendsAmountQuery.data ?? 0);
	let gotFriendRequestQuery = $derived(createQuery({
		queryKey: ['gotFriendRequest', userId, $userStore?.id],
		queryFn: async () => await fetchFriendRequest(userId, $userStore?.id!),
		enabled:
			!!userId && !!$userStore?.id && !isFriend && userId !== $userStore.id,
	}));
	let gotFriendRequest = $derived($gotFriendRequestQuery.data);
	let friendRequestQuery = $derived(createQuery({
		queryKey: ['profileFriendRequest', userId, $userStore?.id],
		queryFn: async () => fetchFriendRequest($userStore?.id!, userId),
		enabled:
			!!userId &&
			!!$userStore &&
			userId !== $userStore.id &&
			!isFriend &&
			!gotFriendRequest,
	}));
	let friendRequestSend = $derived($friendRequestQuery.data);
	run(() => {
		if (
			$profileQuery.isFetched &&
			$friendsAmountQuery.isFetched &&
			(($userStore && $userStore.id !== userId && $isFriendQuery.isFetched) ||
				($userStore && $userStore.id === userId) ||
				!$userStore)
		) {
			profileStore.set({
				userId,
				isPrivate,
				isFriend,
				totalFriends,
				refetchProfileFn: async () => {
					$profileQuery.refetch();
					$blockedQuery.refetch();
					$isFriendQuery.refetch();
					$friendsAmountQuery.refetch();
				},
				refetchFriendsFn: $friendsAmountQuery.refetch,
				refetchIsFriendFn: $isFriendQuery.refetch,
			});
		}
	});
</script>

<div class="grid place-items-center">
	<div
		class="sm:rounded-md py-8 px-4 sm:px-8 bg-surface-600 bg-opacity-60 border-surface-800 border max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg w-full mt-[40px] mb-[40px]"
	>
		<div
			class="grid grid-cols-1 sm:grid-cols-2 gap-x-2 md:grid-cols-3 lg:grid-cols-4 gap-y-8"
		>
			{#if $profileQuery.isLoading || !$profileQuery.data}
				<div class="placeholder-circle animate-pulse mx-auto w-[168px]"></div>
				<div class="grid gap-y-4 md:col-span-2 items-center">
					<div
						class="placeholder animate-pulse w-[80%] sm:w-[120px] h-[24px]"
					></div>
					<div class="placeholder animate-pulse w-[100px] h-[24px]"></div>
					<div class="placeholder animate-pulse sm:w-full h-[40px]"></div>
					<div class="placeholder animate-pulse w-[80%] sm:w-[50%] h-[24px]"></div>
				</div>
			{:else}
				<Avatar
					{userId}
					{stexs}
					{username}
					class="mx-auto w-[168px] {$userStore &&
					$userStore.id !== userId &&
					$blockedQuery.data &&
					$blockedQuery.data.length === 0 &&
					(!isFriend || gotFriendRequest)
						? 'md:w-[148px]'
						: ''} lg:w-[168px] border-2 border-surface-500"
					draggable="false"
				/>
				<div class="grid gap-y-4 md:col-span-2 items-center">
					<p class="text-[20px] sm:text-[24px] break-all font-bold">
						{$profileQuery.data?.username}
					</p>
					{#if (!isPrivate || $userStore?.id === userId || isFriend) && ($blockedQuery.data === undefined || $blockedQuery.data.length === 0)}
						{#if $friendsAmountQuery.isLoading}
							<div class="placeholder animate-pulse w-[100px] h-[20px]"></div>
						{:else}
							<p class="text-[16px]">Friends {$friendsAmountQuery.data ?? 0}</p>
						{/if}
					{/if}
					<div class="flex flex-col space-y-4">
						{#if $profileQuery.data?.bio}
							<p class="text-[14px] dont-break-out">{$profileQuery.data.bio}</p>
						{/if}
						{#if $profileQuery.data?.url}
							<a
								href={$profileQuery.data?.url}
								target="”_blank”"
								class="text-[14px] w-fit break-all group"
							>
								<div class="flex flex-row space-x-2 items-center">
									<Icon
										icon="flowbite:link-outline"
										class="text-white transition"
									/>
									<p
										class="text-secondary-500 group-hover:text-secondary-400 transition"
									>
										{$profileQuery.data.url.split('://')[1]}
									</p>
								</div>
							</a>
						{/if}
					</div>
				</div>
			{/if}
			{#if $userStore && $profileQuery.data && $userStore.id !== $profileQuery.data.user_id && $profileStore}
				<div class="grid pt-[12px] md:col-start-4 md:row-start-1 col-span-full">
					<div class="flex justify-between items-center h-fit md:justify-end">
						<div>
							{#if $blockedQuery.data?.length === 0 && !isFriend}
								{#if gotFriendRequest}
									<div class="flex flex-col mr-2">
										<p class="col-span-2">Friend Request:</p>
										<div class="flex flex-row mt-[4px] space-x-2">
											<Button
												on:click={async () => {
													// accept friend request
												}}
												submitted={acceptFriendRequestSubmitted}
												class="variant-filled-primary py-1 px-2">Accept</Button
											>
											<Button
												on:click={async () => {
													// delete friend request
												}}
												submitted={deleteFriendRequestSubmitted}
												loaderMeter="stroke-red-500"
												loaderTrack="stroke-red-500/20"
												class="h-fit text-[14px] bg-surface-800 py-1 px-2 border border-surface-500"
												>Delete</Button
											>
										</div>
									</div>
								{:else if friendRequestSend}
									<Button
										on:click={async () => {
											// revoke friend request
										}}
										submitted={friendRequestRevocationSubmitted}
										class="h-fit text-[14px] bg-surface-800 py-1 px-2 border border-surface-500 text-red-600"
										>Revoke Friend Request</Button
									>
								{:else if $isFriendQuery.isFetched && $profileQuery.data.accept_friend_requests && !isFriend}
									<Button
										on:click={async () => {
											// send friend request
										}}
										submitted={friendRequestSubmitted}
										class="h-fit text-[14px] variant-filled-primary py-1 px-2"
										>Send Friend Request</Button
									>
								{/if}
							{/if}
						</div>
						<Button class="w-fit h-fit p-1 group">
							<Icon
								icon="pepicons-pop:dots-y"
								class="text-[26px] group-hover:text-surface-400 transition {profileDropDownOpen
									? 'text-surface-400'
									: ''}"
							/>
						</Button>
						<Dropdown
							bind:open={profileDropDownOpen}
							placement="left"
							class="rounded-md bg-surface-900 p-2 space-y-2 border border-surface-500"
						>
							{#if isFriend}
								<DropdownItem
									on:click={async () => {
										// remove friend
									}}
									submitted={removeFriendSubmitted}
									class="hover:!bg-surface-500 rounded text-red-600 whitespace-nowrap"
									>Remove Friend</DropdownItem
								>
							{/if}
							<DropdownItem class="hover:!bg-surface-500 rounded text-red-600"
								>Report</DropdownItem
							>
							{#if isCurrentUserBlocker}
								<DropdownItem
									on:click={() => {
										// open unblock user modal
									}}
									class="hover:!bg-surface-500 rounded text-primary-500"
									>Unblock</DropdownItem
								>
							{:else}
								<DropdownItem
									on:click={() => {
										// open block user modal
									}}
									class="hover:!bg-surface-500 rounded text-red-600"
									>Block</DropdownItem
								>
							{/if}
						</Dropdown>
					</div>
				</div>
			{/if}
		</div>
		<div class="grid grid-rows-1 mt-[28px]">
			{#if $blockedQuery.data?.length > 0}
				<div
					class="grid row-start-2 col-span-full place-items-center bg-surface-800 rounded-md py-10"
				>
					<p class="text-[20px] text-center">
						{#if isCurrentUserBlocker}
							Blocked
						{:else}
							User blocked you
						{/if}
					</p>
				</div>
			{:else if $profileQuery.isLoading || !$profileQuery.data || ($userStore?.id !== $profileStore?.userId && $profileQuery.data.is_private && ($isFriendQuery.isLoading || (!$isFriendQuery.data && $userStore))) || $blockedQuery.isLoading || (!$blockedQuery.data && $userStore && $userStore.id !== $profileStore?.userId)}
				<div
					class="grid row-start-2 col-span-full place-items-center placeholder animate-pulse h-[1000px] rounded-md"
				></div>
			{:else if ($profileQuery.data && !$profileQuery.data.is_private) || ($userStore && $userStore.id === userId) || isFriend}
				<TabGroup
					regionList="flex flex-col xs:flex-row justify-evenly rounded-md bg-surface-700 p-1 space-y-1 xs:space-y-0"
					active="variant-glass-primary text-primary-500"
					border="border-none"
					hover="hover:bg-surface-500"
					class="row-start-2 col-span-full bg-surface-800 rounded-md p-4 relative"
					justify="justify-center"
					rounded="rounded-md"
				>
					<TabAnchor href="/{username}" selected={path === `/${username}`}>
						<span>Inventory</span>
					</TabAnchor>
					<TabAnchor
						href="/{username}/friends"
						selected={path.endsWith('/friends')}
					>
						<span>Friends</span>
					</TabAnchor>
					<TabAnchor
						href="/{username}/organizations"
						selected={path.endsWith('/organizations')}
					>
						<span>Organizations</span>
					</TabAnchor>
					{#snippet panel()}
													
							{@render children?.()}
						
													{/snippet}
				</TabGroup>
			{:else}
				<div
					class="grid row-start-2 col-span-full place-items-center bg-surface-800 rounded-md py-10"
				>
					<p class="text-[20px] text-center">User is private</p>
				</div>
			{/if}
		</div>
	</div>
</div>
