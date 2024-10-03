<script lang="ts">
	import { getUserStore } from '$lib/stores/userStore';
	import Icon from '@iconify/svelte';
	import {
		getModalStore,
		ListBoxItem,
		Paginator,
		type PaginationSettings,
	} from '@skeletonlabs/skeleton';
	import { Dropdown, Search } from 'flowbite-svelte';
	import { Button } from 'ui';
	import { debounce } from 'lodash';
	import { getFlash } from 'sveltekit-flash-message/client';
	import { page } from '$app/stores';
	import { createQuery } from '@tanstack/svelte-query';
	import { stexs } from '../../../stexsClient';

	const userStore = getUserStore();
	const modalStore = getModalStore();
	const flash = getFlash(page);

	let search: string = '';
	let previousSearch: string = '';
	let filter: string = 'A-Z';
	let typeFilter: string = 'All';
	let paginationSettings: PaginationSettings = {
		page: 0,
		limit: 20,
		size: 0,
		amounts: [20, 50, 100],
	};
	let previousLimit: number | undefined;
	const handleSearch = debounce((e: Event) => {
		search = (e.target as HTMLInputElement)?.value || '';
	}, 200);

	$: connectionAmountQuery = createQuery({
		queryKey: ['connectionAmountAccount', $userStore?.id],
		queryFn: async () => {
			const { count } = await stexs
				.from('oauth2_connections')
				.select('', {
					count: 'exact',
					head: true,
				})
				.eq('user_id', $userStore?.id);

			return count;
		},
		enabled: !!$userStore?.id,
	});

	$: paginationSettings.size = $connectionAmountQuery.data;

	async function fetchConnections(
		userId: string,
		search: string,
		filter: string,
		typeFilter: string,
		page: number,
		limit: number,
	) {
		if (!previousLimit) previousLimit = limit;

		if (search !== previousSearch || previousLimit !== limit) {
			previousLimit = limit;
			paginationSettings.page = 0;
			page = 0;
			previousSearch = search;
		}

		const start = page * limit;
		const end = start + limit - 1;

		const query = stexs
			.from('oauth2_connections')
			.select(
				`
					oauth2_apps(
						name,
						organizations!inner(
							id,
							name
						),
						projects!inner(
							id,
							name
						)
					)                
        `,
				{ count: 'exact' },
			)
			.eq('user_id', userId)
			.ilike('oauth2_apps.name', `%${search}%`)
			.not('oauth2_apps', 'is', null)
			.range(start, end);

		if (filter === 'A-Z') {
			query.order('oauth2_apps(name)', { ascending: true });
		}

		if (filter === 'Z-A') {
			query.order('oauth2_apps(name)', { ascending: false });
		}

		if (filter === 'Latest') query.order('created_at', { ascending: false });

		if (filter === 'Oldest') query.order('created_at', { ascending: true });

		if (typeFilter === 'Projects')
			query.not('oauth2_apps.projects', 'is', null);

		if (typeFilter === 'Organizations') query.is('oauth2_apps.projects', null);

		const { data, count } = await query;

		paginationSettings.size = count;

		return data;
	}

	$: connectionsQuery = createQuery({
		queryKey: ['connectionsAccount', $userStore?.id],
		queryFn: async () =>
			await fetchConnections(
				$userStore?.id!,
				search,
				filter,
				typeFilter,
				paginationSettings.page,
				paginationSettings.limit,
			),
		enabled: !!$userStore?.id,
	});
</script>

<div class="px-[4%] md:px-[8%] grid place-items-center mb-[18px]">
	<div class="w-full mt-[40px] lg:max-w-[1200px]">
		<div class="space-y-2">
			<h2 class="h2">Applications</h2>
			<hr class="!border-t-2" />
		</div>
	</div>
	<div
		class="flex flex-col xs:flex-row justify-between mb-[18px] space-y-2 xs:space-y-0 xs:space-x-2 w-full mt-[24px]"
	>
		{#if $connectionsQuery.isLoading || !$connectionsQuery.data}
			<div
				class="placeholder animate-pulse xs:max-w-[300px] w-full h-[42px] rounded-lg"
			/>
			<div
				class="placeholder animate-pulse xs:w-[90px] w-full h-[42px] rounded-lg"
			/>
		{:else if $connectionsQuery.data?.length > 0 && search.length > 0}
			<div
				class="flex flex-col xs:flex-row w-full justify-between space-y-2 xs:space-y-0"
			>
				<div class="xs:max-w-[300px] w-full">
					<Search
						size="md"
						placeholder="Search by Connection Name..."
						on:input={handleSearch}
						class="!bg-surface-500"
					/>
				</div>
				<div
					class="w-full xs:w-fit flex flex-col xs:flex-row items-center space-y-2 xs:space-y-0 xs:space-x-2"
				>
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
								value={'A-Z'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">A-Z</ListBoxItem
							>
							<ListBoxItem
								bind:group={filter}
								name="filter"
								value={'Z-A'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">Z-A</ListBoxItem
							>
							<ListBoxItem
								bind:group={filter}
								name="filter"
								value={'Latest'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">Latest</ListBoxItem
							>
							<ListBoxItem
								bind:group={filter}
								name="filter"
								value={'Oldest'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">Oldest</ListBoxItem
							>
						</Dropdown>
					</div>
					<div class="w-full xs:w-fit">
						<Button
							class="bg-surface-500 border border-gray-600 w-full xs:w-fit py-[8px]"
							>{typeFilter}<Icon
								icon="iconamoon:arrow-down-2-duotone"
								class="text-[22px]"
							/></Button
						>
						<Dropdown
							class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500"
						>
							<ListBoxItem
								bind:group={typeFilter}
								name="filter"
								value={'All'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">All</ListBoxItem
							>
							<ListBoxItem
								bind:group={typeFilter}
								name="filter"
								value={'Organizations'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">Organizations</ListBoxItem
							>
							<ListBoxItem
								bind:group={typeFilter}
								name="filter"
								value={'Projects'}
								active="variant-glass-primary text-primary-500"
								hover="hover:variant-filled-surface"
								class="rounded-md px-4 py-2">Projects</ListBoxItem
							>
						</Dropdown>
					</div>
				</div>
			</div>
		{/if}
	</div>
	<div class="flex flex-col w-full space-y-4">
		{#if $connectionsQuery.isLoading || !$connectionsQuery.data || ($connectionsQuery.isFetching && $connectionsQuery.data.length === 0)}
			{#each Array(20) as _}
				<div class="placeholder animate-pulse h-[98px] w-full" />
			{/each}
		{:else if $connectionsQuery?.data.length > 0}
			{#each Array(20) as _}
				<div class="placeholder h-[98px] w-full" />
			{/each}
		{:else if $connectionAmountQuery.data > 0 && (search.length > 0 || $connectionsQuery.data.length === 0)}
			<div class="grid place-items-center rounded-md col-span-full">
				<p class="text-[18px] p-4 text-center">No apps found</p>
			</div>
		{:else}
			<div class="grid place-items-center rounded-md col-span-full">
				<p class="text-[18px] p-6 text-center">
					You have no apps connected to your account
				</p>
			</div>
		{/if}
	</div>
	{#if $connectionsQuery.isLoading || !$connectionsQuery.data}
		<div
			class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-[18px] w-full"
		>
			<div class="placeholder animate-pulse h-[42px] w-full md:w-[150px]" />
			<div class="placeholder animate-pulse h-[34px] w-full max-w-[230px]" />
		</div>
	{:else if paginationSettings.size / paginationSettings.limit > 1 || paginationSettings.limit > 20 || ($connectionAmountQuery.data > 20 && search.length > 0 && $connectionsQuery.data.length > 0)}
		<div class="mt-[18px] w-full">
			<Paginator
				bind:settings={paginationSettings}
				showFirstLastButtons={true}
				showPreviousNextButtons={true}
				amountText="Apps"
				select="!bg-surface-500 !border-gray-600 select min-w-[150px]"
				controlVariant="bg-surface-500 border border-gray-600 flex-wrap"
			/>
		</div>
	{/if}
</div>
