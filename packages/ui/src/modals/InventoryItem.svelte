<script lang="ts">
	import formatJSON from '../utils/jsonFormater';
	import Icon from '@iconify/svelte';
	import Button from '../components/Button/Button.svelte';
	import ItemThumbnail from '../components/ItemThumbnail/ItemThumbnail.svelte';
	import ProjectLogo from '../components/ProjectLogo/ProjectLogo.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import StexsClient from 'stexs-client';
	import { Modal } from '@skeletonlabs/skeleton-svelte';

	type InventoryData = {
		id: number;
		items: {
			id: number;
			name: string;
			projects: {
				id: number;
			};
		};
	}

	interface Props {
		stexs: StexsClient;
		inventoryData: InventoryData;
		userId: string;
		open: boolean;
	}

	let {
		stexs,
		inventoryData,
		userId,
		open = $bindable(false)
	}: Props = $props();


	async function fetchItemFromInventory() {
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
			.eq('item_id', inventoryData.items.id)
			.single();

		return data;
	}

	let inventoryItemQuery = $derived(createQuery({
		queryKey: ['inventoryItemView', inventoryData.id],
		queryFn: fetchItemFromInventory,
	}));

	const closeModal = () => {
		open = false;
	};
</script>

<Modal
	bind:open
>
	{#snippet content()}
		<div class="card p-5 flex flex-col max-w-[380px] w-full relative">
			<div class="absolute right-[8px] top-[8px] z-10">
				<Button onclick={closeModal} class="p-2 variant-ghost-surface">
					<Icon icon="ph:x-bold" />
				</Button>
			</div>
			<div class="space-y-6">
				{#if $inventoryItemQuery.isLoading || !$inventoryItemQuery.data}
					<div class="placeholder animate-pulse aspect-square h-full w-full"></div>
					<div class="placeholder animate-pulse h-[24px] max-w-[280px]"></div>
					<div class="flex flex-row space-x-2">
						<div class="placeholder animate-pulse w-[48px] h-[48px]"></div>
						<div class="flex flex-col space-y-2 w-[180px]">
							<div class="placeholder animate-pulse h-[20px]"></div>
							<div class="placeholder animate-pulse h-[20px]"></div>
						</div>
					</div>
					<div class="placeholder animate-pulse h-[24px] max-w-[200px]"></div>
					<div class="placeholder animate-pulse h-[200px] w-full"></div>
					<div class="placeholder animate-pulse h-[100px] w-full"></div>
					<div class="placeholder animate-pulse h-[24px] max-w-[220px]"></div>
				{:else}
					{@const inventoryItem = $inventoryItemQuery.data}
					<ItemThumbnail
						{stexs}
						itemId={inventoryData.items.id}
						itemName={inventoryData.items.name}
						showOnFail={false}
						imageClass="mb-[26px]"
					/>
					<a
						href="/items/{inventoryData.items.id}"
						class="text-[24px] hover:text-secondary-400 transition font-bold break-all"
						>{inventoryData.items.name}</a
					>
					<div class="flex flex-row space-x-2">
						<a
							href="/organizations/{inventoryItem.items.projects
								.organizations.name}/projects/{inventoryItem.items
								.projects.name}"
						>
							<div
								class="w-[48px] h-[48px] bg-surface-600 transition border border-gray-600 hover:border-primary-500 rounded-md inline-flex items-center justify-center text-center"
							>
								<ProjectLogo
									{stexs}
									projectId={inventoryData.items.projects.id}
									alt={$inventoryItemQuery.data.items.projects.name}
									class="rounded-md"
								/>
							</div>
						</a>
						<div class="flex flex-col">
							<a
								href="/organizations/{inventoryItem.items.projects
									.organizations.name}/projects/{inventoryItem.items
									.projects.name}"
								class="text-[14px] text-gray-500 hover:text-secondary-400 transition break-all"
								>{inventoryItem.items.projects.name}</a
							>
							<a
								href="/organizations/{inventoryItem.items.projects
									.organizations.name}"
								class="text-[14px] text-gray-500 hover:text-secondary-400 transition break-all"
								>{inventoryItem.items.projects.organizations.name}</a
							>
						</div>
					</div>
					{#if inventoryItem.amount !== null}
						<p class="text-[18px]">Amount: {inventoryItem.amount}</p>
					{/if}
					{#if inventoryItem.items.description}
						<p class="text-[16px]">
							{inventoryItem.items.description}
						</p>
					{/if}
					{#if Object.entries(inventoryItem.parameter).length > 0}
						<div class="space-y-1">
							<p class="text-[18px]">Parameter:</p>
							<pre
								class="pre text-[14px] max-h-[300px] whitespace-pre">{@html formatJSON(
									inventoryItem.parameter,
								)}</pre>
						</div>
					{/if}
					<p class="text-[18px]">
						Last modified: {inventoryItem.updated_at
							? new Date(inventoryItem.updated_at).toLocaleString()
							: '-'}
					</p>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>
