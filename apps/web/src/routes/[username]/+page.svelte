<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { stexs } from '../../stexsClient';
	import { getUserStore } from '$lib/stores/userStore';
	import { getProfileStore } from '$lib/stores/profileStore';
	import { Dropdown, DropdownDivider, Search } from 'flowbite-svelte';
	import {
		Pagination,
		Segment,
		ProgressRing
	} from '@skeletonlabs/skeleton-svelte';
	import { Button, ProjectLogo, ItemThumbnail } from 'ui';
	import Icon from '@iconify/svelte';
	import lodash from 'lodash';

	const { debounce } = lodash;

	const profileStore = getProfileStore();
	const userStore = getUserStore();

	let search: string = $state('');
	let previousSearch: string = '';
	let projectSearch: string = $state('');
	let filterTime: string = $state('Latest');
	let filterAlphabet: string = $state('');
	let filterAmount: string = $state('');
	let projectWindow: any = $state();
	let selectedProject: string = $state('All');

	let totalSize: number = $state(0);
	let page: number = $state(0);
	let limit: 20 | 50 | 100 = $state(20);

	let previousLimit: number | undefined = $state();
	let previousProject: string = $state('');
	const handleSearch = debounce((e: Event) => {
		search = (e.target as HTMLInputElement)?.value || '';
	}, 300);
	const handleProjectSearch = debounce((e: Event) => {
		projectSearch = (e.target as HTMLInputElement)?.value || '';
	}, 300);

	async function fetchProjectsInUsersInventory(
		userId: string,
		pointer: number | null = null,
		search: string | null = null,
	) {
		const { data } = await stexs.rpc('get_distinct_projects_from_inventory', {
			user_id_param: userId,
			pointer,
			search_param: search,
		});

		return data;
	}

	async function fetchInventory(
		userId: string,
		search: string,
		filters: {
			filterTime: string;
			filterAlphabet: string;
			filterAmount: string;
		},
		selectedProject: string,
		page: number,
		limit: number,
	) {
		const { filterTime, filterAlphabet, filterAmount } = filters;

		if (!previousLimit) previousLimit = limit;

		if (
			search !== previousSearch ||
			previousProject !== selectedProject ||
			previousLimit !== limit
		) {
			previousLimit = limit;
			page = 0;
			previousSearch = search;
			previousProject = selectedProject;
		}

		const start = page * limit;
		const end = start + limit - 1;

		const query = stexs
			.from('inventories')
			.select(
				`
					id,
					items(
						id,
						name,
						projects(
							id
						)
					)
				`,
				{ count: 'exact' },
			)
			.eq('user_id', userId)
			.ilike('items.name', `%${search}%`)
			.not('items', 'is', null)
			.not('items.projects', 'is', null)
			.range(start, end);

		if (filterTime === 'Latest')
			query
				.order('created_at', { ascending: true })
				.order('updated_at', { ascending: true });

		if (filterTime === 'Oldest')
			query
				.order('created_at', { ascending: false })
				.order('updated_at', { ascending: false });

		if (filterAmount === 'Unique')
			query.order('amount', {
				ascending: true,
				nullsFirst: true,
			});

		if (filterAmount === 'LtH')
			query.order('amount', { ascending: true });

		if (filterAmount === 'HtL')
			query.order('amount', {
				ascending: false,
				nullsFirst: false,
			});

		if (filterAlphabet === 'A-Z')
			query.order('items(name)', { ascending: true });

		if (filterAlphabet === 'Z-A')
			query.order('items(name)', { ascending: false });

		if (selectedProject.length > 0)
			query.eq('items.projects.id', selectedProject);

		const { data, count } = await query;

		totalSize = count;

		return data;
	}

	async function fetchItemFromInventory(params: {
		userId: string;
		itemId: number;
	}) {
		const { userId, itemId } = params;

		const { data } = await stexs
			.from('inventories')
			.select(
				`
					amount,
					parameter,
					updated_at,
					items(
						description,
						projects(
							name,
							organizations(
								name
							)
						)
        			)
				`,
			)
			.eq('user_id', userId)
			.eq('item_id', itemId)
			.single();

		return data;
	}

	let projects: { id: number; name: string; organization_name: string }[] = $state([]);

	async function handleScroll() {
		if (
			projectWindow &&
			projectWindow.scrollHeight - projectWindow.scrollTop <=
				projectWindow.clientHeight + 1
		) {
			projects = [
				...projects,
				...(await fetchProjectsInUsersInventory(
					$profileStore?.userId!,
					projects[-1].id,
					projectSearch,
				)),
			];
		}
	}
	let itemsAmountQuery = $derived(createQuery({
		queryKey: ['itemsAmountInventory', $profileStore?.userId],
		queryFn: async () => {
			const { count } = await stexs
				.from('inventories')
				.select('', {
					count: 'exact',
					head: true,
				})
				.eq('user_id', $profileStore?.userId);

			return count;
		},
		enabled: !!$profileStore?.userId,
	}));

	$effect(() => {
		totalSize = $itemsAmountQuery.data;
	});

	let projectsQuery = $derived(createQuery({
		queryKey: ['projectsInInventory', $profileStore?.userId],
		queryFn: async () =>
			await fetchProjectsInUsersInventory(
				$profileStore?.userId!,
				null,
				projectSearch,
			),
		enabled: !!$profileStore?.userId,
	}));
	let inventoryQuery = $derived(createQuery({
		queryKey: ['inventories', $profileStore?.userId],
		queryFn: async () =>
			await fetchInventory(
				$profileStore?.userId!,
				search,
				{ filterTime, filterAlphabet, filterAmount },
				selectedProject,
				page,
				limit,
			),
		enabled: !!$profileStore?.userId,
	}));
	let selectedProjectName =
		$derived(selectedProject === undefined || typeof selectedProject === 'string'
			? 'All'
			: $projectsQuery?.data.filter(
					(project: { id: number; name: string }) =>
						project.id === Number(selectedProject),
				)[0].name);

	$effect(() => {
		projects = $projectsQuery.data || [];
	});
</script>

<div
	class="flex flex-col xs:flex-row justify-between mb-[18px] space-y-2 xs:space-y-0 xs:space-x-2"
>
	{#if $inventoryQuery.isLoading || !$inventoryQuery.data}
		<div
			class="placeholder animate-pulse xs:max-w-[300px] w-full h-[41.75px] rounded-lg"
		></div>
		<div
			class="w-full xs:w-fit flex flex-col xs:flex-row items-center space-y-2 xs:space-y-0 xs:space-x-2"
		>
			<div class="placeholder animate-pulse w-full xs:w-[115px] h-[41.75px]"></div>
			<div class="placeholder animate-pulse w-full xs:w-[85px] h-[41.75px]"></div>
		</div>
	{:else if $itemsAmountQuery.data > 0}
		<div class="xs:max-w-[300px] w-full">
			<Search
				size="md"
				placeholder="Search by Item Name..."
				on:input={handleSearch}
				class="!bg-surface-500"
			/>
		</div>
		<div
			class="w-full xs:w-fit flex flex-col xs:flex-row items-center space-y-2 xs:space-y-0 xs:space-x-2"
		>
			<div class="w-full xs:w-fit">
				<Button
					class="bg-surface-500 border border-gray-600 w-full py-[8px] xs:w-fit"
					>Sort by<Icon
						icon="iconamoon:arrow-down-2-duotone"
						class="text-[24px]"
					/></Button
				>
				<Dropdown
					class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500 max-h-[400px] overflow-y-auto"
				>
					<Segment
						bind:value={filterTime}
					>
						<Segment.Item 
							value="Latest"
						>Latest</Segment.Item>
						<Segment.Item 
							value="Oldest"
						>Oldest</Segment.Item>
						<Segment.Item 
							value=""
						>No Filter</Segment.Item>
					</Segment>
					<DropdownDivider />
					<Segment
						bind:value={filterAmount}
					>
						<Segment.Item 
							value="Unique"
						>Unique</Segment.Item>
						<Segment.Item
							value="LtH"
						>Amount: Low to high</Segment.Item>
						<Segment.Item
							value="HtL"
						>Amount: High to low</Segment.Item>
						<Segment.Item 
							value=""
						>No Filter</Segment.Item>
					</Segment>
					<DropdownDivider />
					<Segment
						bind:value={filterAlphabet}
					>
						<Segment.Item
							value="A-Z"
						>A-Z</Segment.Item>
						<Segment.Item
							value="Z-A"
						>Z-A</Segment.Item>
						<Segment.Item
							value=""
						>No Filter</Segment.Item>
					</Segment>
				</Dropdown>
			</div>
			<div class="w-full md:w-fit">
				<Button
					class="bg-surface-500 border border-gray-600 w-full py-[8px] md:w-fit"
					>{selectedProjectName}<Icon
						icon="iconamoon:arrow-down-2-duotone"
						class="text-[24px]"
					/></Button
				>
				<Dropdown
					class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500 xs:min-w-[240px]"
				>
					<Search
						size="md"
						placeholder="Search..."
						on:input={handleProjectSearch}
						class="!bg-surface-500"
					/>
					<Segment
						bind:value={selectedProject}
						classes="!bg-surface-800 !border-0"
					>
						<Segment.Item
							value='All'>All</Segment.Item
						>
						{#if $projectsQuery.isLoading || !$projectsQuery.data}
							<div class="flex justify-center p-4">
								<ProgressRing value={null} size="w-[30px]" />
							</div>
						{:else}
							{#if $projectsQuery.data && $projectsQuery.data.length > 0}
								{#each $projectsQuery.data as project (project.id)}
									<Segment.Item
										value={project.id}
									>
										<div class="flex flex-row space-x-2">
											<div
												class="w-[48px] h-[48px] bg-surface-600 border border-gray-600 rounded-md inline-flex items-center justify-center text-center"
											>
												<ProjectLogo
													{stexs}
													projectId={project.id}
													alt={project.name}
													class="rounded-md"
												/>
											</div>
											<div class="flex flex-col">
												<p class="text-[14px]">{project.name}</p>
												<p class="text-[14px]">{project.organization_name}</p>
											</div>
										</div>
									</Segment.Item>
								{/each}
							{:else if $projectsQuery.data?.length === 0}
								<div
									class="h-[56px] px-4 p-1 flex justify-center items-center"
								>
									<p class="text-[18px]">No projects found</p>
								</div>
							{/if}
						{/if}
					</Segment>
				</Dropdown>
			</div>
		</div>
	{/if}
</div>
<div
	class="grid gap-3 place-items-center grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
>
	{#if $inventoryQuery.isLoading || !$inventoryQuery.data}
		{#each Array(50) as _}
			<div class="placeholder animate-pulse aspect-square w-full h-full"></div>
		{/each}
	{:else if $inventoryQuery.data && $inventoryQuery.data.length > 0}
		{#each $inventoryQuery.data as inventory (inventory.id)}
			<Button
				title={inventory.items.name}
				class="p-0 card-hover aspect-square h-full w-full rounded-md bg-surface-700 border-2 border-surface-600 hover:border-primary-500"
				on:click={() => {
					// open item modal
				}}
			>
				<ItemThumbnail
					{stexs}
					itemId={inventory.items.id}
					itemName={inventory.items.name}
				/>
			</Button>
		{/each}
	{:else if $itemsAmountQuery?.data > 0 && (search.length > 0 || $inventoryQuery.data.length === 0)}
		<div
			class="grid place-items-center bg-surface-800 rounded-md col-span-full"
		>
			<p class="text-[18px] p-4 text-center">No items found</p>
		</div>
	{:else}
		<div
			class="grid place-items-center bg-surface-800 rounded-md col-span-full"
		>
			<p class="text-[18px] p-6 text-center">
				{$userStore?.id === $profileStore?.userId
					? 'You have no items in your inventory'
					: 'User has no items in inventory'}
			</p>
		</div>
	{/if}
</div>
{#if $inventoryQuery.isLoading || !$inventoryQuery.data}
	<div
		class="flex justify-between flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-[18px]"
	>
		<div class="placeholder animate-pulse h-[42px] w-full md:w-[150px]"></div>
		<div class="placeholder animate-pulse h-[34px] w-full max-w-[230px]"></div>
	</div>
{:else if totalSize / limit > 1 || limit > 20 || ($itemsAmountQuery.data > 20 && search.length > 0 && $inventoryQuery.data.length > 0)}
	<div class="mt-[18px]">
		<Pagination
			bind:data={$inventoryQuery.data}
			bind:page
			bind:pageSize={$inventoryQuery.data.length}		
			alternative
		/>
	</div>
{/if}
