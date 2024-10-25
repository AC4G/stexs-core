<script lang="ts">
	import { type SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import formatJSON from '../utils/jsonFormater';
	import Icon from '@iconify/svelte';
	import Button from '../Button.svelte';
	import ItemThumbnail from '../ItemThumbnail.svelte';
	import ProjectLogo from '../ProjectLogo.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import StexsClient from 'stexs-client';

	export let parent: SvelteComponent;

	const modalStore = getModalStore();
	let data = $modalStore[0].meta.data;
	let fn: (fnParams: { userId: string; projectId: number }) => Promise<any> =
		$modalStore[0].meta.fn;
	let fnParams: { userId: string; projectId: number } =
		$modalStore[0].meta.fnParams;
	let stexs: StexsClient = $modalStore[0].meta.stexsClient;

	$: inventoryItemQuery = createQuery({
		queryKey: ['inventoryItemView', data.id],
		queryFn: async () => await fn(fnParams),
	});
</script>

{#if $modalStore[0]}
	<div class="card p-5 flex flex-col max-w-[380px] w-full relative">
		<div class="absolute right-[8px] top-[8px] z-10">
			<Button on:click={parent.onClose} class="p-2 variant-ghost-surface">
				<Icon icon="ph:x-bold" />
			</Button>
		</div>
		<div class="space-y-6">
			{#if $inventoryItemQuery.isLoading || !$inventoryItemQuery.data}
				<div class="placeholder animate-pulse aspect-square h-full w-full" />
				<div class="placeholder animate-pulse h-[24px] max-w-[280px]" />
				<div class="flex flex-row space-x-2">
					<div class="placeholder animate-pulse w-[48px] h-[48px]" />
					<div class="flex flex-col space-y-2 w-[180px]">
						<div class="placeholder animate-pulse h-[20px]" />
						<div class="placeholder animate-pulse h-[20px]" />
					</div>
				</div>
				<div class="placeholder animate-pulse h-[24px] max-w-[200px]" />
				<div class="placeholder animate-pulse h-[200px] w-full" />
				<div class="placeholder animate-pulse h-[100px] w-full" />
				<div class="placeholder animate-pulse h-[24px] max-w-[220px]" />
			{:else}
				<ItemThumbnail
					{stexs}
					itemId={data.items.id}
					itemName={data.items.name}
					showOnFail={false}
					imageClass="mb-[26px]"
				/>
				<a
					href="/items/{data.items.id}"
					class="text-[24px] hover:text-secondary-400 transition font-bold break-all"
					>{data.items.name}</a
				>
				<div class="flex flex-row space-x-2">
					<a
						href="/organizations/{$inventoryItemQuery.data.items.projects
							.organizations.name}/projects/{$inventoryItemQuery.data.items
							.projects.name}"
					>
						<div
							class="w-[48px] h-[48px] bg-surface-600 transition border border-gray-600 hover:border-primary-500 rounded-md inline-flex items-center justify-center text-center"
						>
							<ProjectLogo
								{stexs}
								projectId={data.items.projects.id}
								alt={$inventoryItemQuery.data.items.projects.name}
								class="rounded-md"
							/>
						</div>
					</a>
					<div class="flex flex-col">
						<a
							href="/organizations/{$inventoryItemQuery.data.items.projects
								.organizations.name}/projects/{$inventoryItemQuery.data.items
								.projects.name}"
							class="text-[14px] text-gray-500 hover:text-secondary-400 transition break-all"
							>{$inventoryItemQuery.data.items.projects.name}</a
						>
						<a
							href="/organizations/{$inventoryItemQuery.data.items.projects
								.organizations.name}"
							class="text-[14px] text-gray-500 hover:text-secondary-400 transition break-all"
							>{$inventoryItemQuery.data.items.projects.organizations.name}</a
						>
					</div>
				</div>
				{#if $inventoryItemQuery.data.amount !== null}
					<p class="text-[18px]">Amount: {$inventoryItemQuery.data.amount}</p>
				{/if}
				{#if $inventoryItemQuery.data.items.description}
					<p class="text-[16px]">
						{$inventoryItemQuery.data.items.description}
					</p>
				{/if}
				{#if Object.entries($inventoryItemQuery.data.parameter).length > 0}
					<div class="space-y-1">
						<p class="text-[18px]">Parameter:</p>
						<pre
							class="pre text-[14px] max-h-[300px] whitespace-pre">{@html formatJSON(
								$inventoryItemQuery.data.parameter,
							)}</pre>
					</div>
				{/if}
				<p class="text-[18px]">
					Last modified: {$inventoryItemQuery.data.updated_at
						? new Date($inventoryItemQuery.data.updated_at).toLocaleString()
						: '-'}
				</p>
			{/if}
		</div>
	</div>
{/if}
