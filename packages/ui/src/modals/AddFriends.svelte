<script lang="ts">
	import { onMount, type SvelteComponent } from 'svelte';
	import {
		getModalStore,
		Paginator,
		type PaginationSettings,
		ListBoxItem,
	} from '@skeletonlabs/skeleton';
	import Icon from '@iconify/svelte';
	import Button from '../Button.svelte';
	import { Dropdown, Search } from 'flowbite-svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { debounce } from 'lodash';
	import Avatar from '../Avatar.svelte';
	import { page } from '$app/stores';

	export let parent: SvelteComponent;

	const modalStore = getModalStore();
	const stexs = $modalStore[0].meta.stexsClient;
	const userId = $modalStore[0].meta.userId;
	const flash = $modalStore[0].meta.flash;
	let search: string = '';
	let filter: string = 'All';
	let submitted: number;
	let operationSubmitted: boolean = false;
	let paginationSettings: PaginationSettings = {
		page: 0,
		limit: 20,
		size: 0,
		amounts: [20, 50],
	};
	const handleSearch = debounce((e: Event) => {
		search = (e.target as HTMLInputElement)?.value || '';
	}, 200);

	onMount(() => {
		const input = document.getElementById('add-friends-search');
		if (input) {
			input.focus();
		}
	});

	async function fetchUserProfiles(
		search: string,
		filter: string,
		page: number,
		limit: number,
	) {
		if (search.length === 0 && filter === 'All') {
			paginationSettings.size = 0;
			return null;
		}

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

		paginationSettings.size = count;

		return data;
	}

	$: searchForFriendsQuery = createQuery({
		queryKey: [
			'searchForFriends',
			userId,
			paginationSettings.page,
			paginationSettings.limit,
		],
		queryFn: async () =>
			fetchUserProfiles(
				search,
				filter,
				paginationSettings.page,
				paginationSettings.limit,
			),
	});
</script>

{#if $modalStore[0]}
	<div
		class="card p-3 sm:p-5 flex flex-col max-w-[600px] max-h-[90vh] min-h-[90vh] w-full relative"
	>
		<div>
			<div class="absolute right-[8px] top-[8px]">
				<Button on:click={parent.onClose} class="p-3 variant-ghost-surface">
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
				on:input={handleSearch}
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
					<ListBoxItem
						bind:group={filter}
						name="filter"
						value={'All'}
						active="variant-glass-primary text-primary-500"
						hover="hover:variant-filled-surface"
						class="rounded-md px-4 py-2">All</ListBoxItem
					>
					<ListBoxItem
						bind:group={filter}
						name="filter"
						value={'Pending'}
						active="variant-glass-primary text-primary-500"
						hover="hover:variant-filled-surface"
						class="rounded-md px-4 py-2">Pending</ListBoxItem
					>
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
							on:click={parent.onClose}
							class="flex justify-left items-center group gap-4"
						>
							<div class="w-fit h-fit">
								<Avatar
									class="w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] border-2 border-surface-600 group-hover:border-primary-500 !bg-surface-800 transition {$page.url.pathname.startsWith(
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
									class="text-[14px] sm:text-[16px] text-left break-all group-hover:text-secondary-400 transition {$page.url.pathname.startsWith(
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
								<p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">
									Is Friend
								</p>
							{:else if profile.user_id === userId}
								<p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">
									You
								</p>
							{:else if profile.have_blocked.length > 0}
								<p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">
									Blocked
								</p>
							{:else if profile.been_blocked.length > 0}
								<p class="text-[12px] sm:text-[16px] badge variant-ghost-surface">
									Blocked You
								</p>
							{:else if profile.friend_requests.length > 0}
								<Button
									submitted={submitted === i}
									on:click={async () => {
										if (operationSubmitted) return;

										operationSubmitted = true;

										submitted = i;
										await $modalStore[0].meta.revokeFriendRequest(
											userId,
											profile.user_id,
											flash,
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
									on:click={async () => {
										if (operationSubmitted) return;

										operationSubmitted = true;

										submitted = i;
										await $modalStore[0].meta.sendFriendRequest(
											profile.username,
											userId,
											profile.user_id,
											flash,
										);
										submitted = null;
										$searchForFriendsQuery.refetch();

										operationSubmitted = false;

										$modalStore[0].meta.onSendFriendRequest();
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
		{#if paginationSettings.size / paginationSettings.limit > 1 || paginationSettings.limit > 20}
			<div class="pt-6">
				<Paginator
					bind:settings={paginationSettings}
					showFirstLastButtons={true}
					showPreviousNextButtons={true}
					amountText="Users"
					select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
					controlVariant="bg-surface-500 border border-gray-600"
				/>
			</div>
		{/if}
	</div>
{/if}
