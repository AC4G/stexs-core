<script lang="ts">
	import { Pagination } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import Button from '../components/Button/Button.svelte';
	import { Search, type SearchProps } from 'svelte-5-ui-lib';
	import { Dropdown } from 'flowbite-svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import lodash from 'lodash';
	import Avatar from '../components/Avatar/Avatar.svelte';
	//@ts-ignore
	import { page as pageStore } from '$app/stores';
	import StexsClient from 'stexs-client';
	import { Modal, Segment } from '@skeletonlabs/skeleton-svelte';
	import type { SvelteComponent } from 'svelte';

	const { debounce } = lodash;

	interface Props {
		stexs: StexsClient;
		userId: string;
		open: boolean;
		sendFriendRequest: (
			username: string,
			requester_id: string,
			addressee_id: string
		) => Promise<void>;
		revokeFriendRequest: (
		requester_id: string,
			addressee_id: string
		) => Promise<void>;
	}

	let {
		stexs,
		userId,
		open = $bindable(false),
		sendFriendRequest,
		revokeFriendRequest
	}: Props = $props();

	let search: string = $state('');
	let filter: string = $state('All');
	let submitted: number = $state();
	let operationSubmitted: boolean = $state(false);

	let page: number = $state(0);
	let pageSize: number = $state(20);
	let count: number = $state(0);
	let pageSizes: number[] = $state([20, 50]);

	const handleSearch = debounce((e: Event) => {
		search = (e.target as HTMLInputElement)?.value || '';
	}, 200);

	let searchInput: SvelteComponent<SearchProps<unknown>, {}, {}> = $state();

	async function fetchUserProfiles(
		search: string,
		filter: string,
		page: number,
		limit: number,
	) {
		const start = page * limit;
		const end = start + limit - 1;

		const { data, count } = await stexs
			.from('profiles')
			.select(
				`
					user_id,
					username,
					accept_friend_requests,
					friends!friends_friend_id_fkey(
						user_id
					),
					friend_requests!friend_requests_addressee_id_fkey${filter === 'Pending' ? '!inner' : ''}(
						requester_id
					),
					have_blocked:blocked!blocked_blocked_id_fkey(
						blocked_id
					),
					been_blocked:blocked!blocked_blocker_id_fkey(
						blocker_id
					)
				`,
				{ count: 'exact' },
			)
			.ilike('username', `%${search}%`)
			.order('username', { ascending: true })
			.eq('friends.user_id', userId)
			.eq('friend_requests.requester_id', userId)
			.range(start, end);

		return {
			data,
			count
		};
	}

	let searchForFriendsQuery = $derived(createQuery({
		queryKey: [
			'searchForFriends',
			userId,
			page,
			pageSize,
		],
		queryFn: async () => {
			if (search.length === 0 && filter === 'All') {
				count = 0;
				return null;
			}

			let dataObject = await fetchUserProfiles(
				search,
				filter,
				page,
				pageSize,
			);

			count = dataObject.count;

			return dataObject.data;
		},
	}));

	function onOpenChange(details: { open: boolean }) {
		if (!details.open) return;

		searchInput.focus();
	}

	const closeModal = () => {
		open = false;
	};
</script>

<Modal
	bind:open
	{onOpenChange}
>
	{#snippet content()}
		<div
			class="card p-3 sm:p-5 flex flex-col max-w-[600px] max-h-[90vh] min-h-[90vh] w-full relative"
		>
		<div>
			<div class="absolute right-[8px] top-[8px]">
				<Button onclick={closeModal} class="p-3 variant-ghost-surface">
					<Icon icon="ph:x-bold" />
				</Button>
			</div>
			<div class="h-fit w-[74%]">
				<p class="text-[22px] text-primary-500">Add Friends</p>
			</div>
		</div>
		<div
			class="flex py-6 flex-col xs:flex-row w-full justify-between space-y-2 xs:space-y-0 xs:space-x-4 items-center"
		>
			<Search
				id="add-friends-search"
				size="md"
				placeholder="Search by Username..."
				oninput={handleSearch}
				bind:this={searchInput}
				class="!bg-surface-500 !outline-none sm:max-w-[300px]"
			/>
			<div class="w-full xs:w-fit">
				<Button
					class="bg-surface-500 border border-gray-600 w-full xs:w-fit py-[8px]"
					>{filter}<Icon
						icon="iconamoon:arrow-down-2-duotone"
						class="text-[22px]"
					/></Button
				>
				<Dropdown
					class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500"
				>
					<Segment>
						<Segment.Item
							value="all"
							classes="rounded-md px-4 py-2">All</Segment.Item
						>
						<Segment.Item
							value="pending"
							classes="rounded-md px-4 py-2">Pending</Segment.Item
						>
					</Segment>
				</Dropdown>
			</div>
		</div>
		<div class="flex flex-col items-center space-y-2 overflow-y-auto">
			{#if $searchForFriendsQuery.data}
				{#each $searchForFriendsQuery.data as profile, i (profile.user_id)}
					<div
						class="flex flex-row rounded-md transition items-center justify-between px-2 sm:px-4 py-2 w-full bg-surface-700 border border-surface-600 space-x-4"
					>
						<a
							href="/{profile.username}"
							onclick={close}
							class="flex justify-left items-center group gap-4"
						>
							<div class="w-fit h-fit">
								<Avatar
									classes="w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] border-2 border-surface-600 group-hover:border-primary-500 !bg-surface-800 transition {$pageStore.url.pathname.startsWith(
										`/${profile.username}`,
									)
										? '!border-primary-500'
										: ''}"
									userId={profile.user_id}
									username={profile.username}
									{stexs}
								/>
							</div>
							<div class="w-fit h-full">
								<p
									class="text-[14px] sm:text-[16px] text-left break-all group-hover:text-secondary-400 transition {$pageStore.url.pathname.startsWith(
										`/${profile.username}`,
									)
										? '!text-secondary-400'
										: ''}"
								>
									{profile.username}
								</p>
							</div>
						</a>
						<div class="w-fit h-fit">
							{#if profile.friends?.length > 0}
								<p
									class="text-[12px] sm:text-[16px] badge variant-ghost-surface"
								>
									Is Friend
								</p>
							{:else if profile.user_id === userId}
								<p
									class="text-[12px] sm:text-[16px] badge variant-ghost-surface"
								>
									You
								</p>
							{:else if profile.have_blocked.length > 0}
								<p
									class="text-[12px] sm:text-[16px] badge variant-ghost-surface"
								>
									Blocked
								</p>
							{:else if profile.been_blocked.length > 0}
								<p
									class="text-[12px] sm:text-[16px] badge variant-ghost-surface"
								>
									Blocked You
								</p>
							{:else if profile.friend_requests.length > 0}
								<Button
									submitted={submitted === i}
									onclick={async () => {
										if (operationSubmitted) return;

										operationSubmitted = true;

										submitted = i;
										await revokeFriendRequest(
											userId,
											profile.user_id
										);
										submitted = null;
										$searchForFriendsQuery.refetch();

										operationSubmitted = false;
									}}
									title="Revoke Friend Requests"
									class="h-fit text-[14px] variant-ghost-error py-2 px-2"
									progressClass="w-[14px]"
								>
									<Icon icon="pepicons-pop:minus" />
								</Button>
							{:else if profile.accept_friend_requests}
								<Button
									submitted={submitted === i}
									onclick={async () => {
										if (operationSubmitted) return;

										operationSubmitted = true;

										submitted = i;
										await sendFriendRequest(
											profile.username,
											userId,
											profile.user_id
										);
										submitted = null;
										$searchForFriendsQuery.refetch();

										operationSubmitted = false;
									}}
									title="Send Friend Requests"
									class="h-fit text-[14px] variant-ghost-primary py-2 px-2"
									progressClass="w-[14px]"
								>
									<Icon icon="pepicons-pop:plus" />
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
			{#if $searchForFriendsQuery.data?.length === 0 && search.length > 0}
				<p class="text-[18px]">No users found</p>
			{:else if $searchForFriendsQuery.data?.length === 0 && search.length === 0 && filter === 'Pending' && !$searchForFriendsQuery.isFetching}
				<p class="text-[18px]">No pending friend requests</p>
			{:else if search.length === 0 && filter === 'All'}
				<p class="text-[18px]">Start typing to search for friends</p>
			{/if}
		</div>
			{#if count / pageSize > 1 || pageSize > 20}
				<div class="pt-6 flex flex-col space-y-2 md:space-y-0 md:flex-row md:justify-between">
					<select name="page-size" id="page-size" bind:value={pageSize} class="select max-w-[150px]">
						{#each pageSizes as size}
							<option value={size}>Users {size}</option>
						{/each}
					</select>

					<Pagination
						data={$searchForFriendsQuery.data}
						{page}
						{pageSize}
						{count}
						alternative
					/>
				</div>
			{/if}
		</div>
	{/snippet}
</Modal>
