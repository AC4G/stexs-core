<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';

	interface Props {
		stexs: any;
		itemId: string;
		itemName: string;
		showOnFail?: boolean;
		imageClass?: string;
	}

	let {
		stexs,
		itemId,
		itemName,
		showOnFail = true,
		imageClass = ''
	}: Props = $props();

	let loading: boolean = $state(true);
	let loaded: boolean = $state(false);
	let failed: boolean = $state(false);
	let prevUrl: string = $state('');

	const query = createQuery({
		queryKey: ['itemThumbnail', itemId],
		queryFn: async () => {
			return await stexs.storage.getItemThumbnailUrl(itemId);
		},
	});

	const img = $state(new Image());

	$effect(() => {
		if ($query.data && prevUrl !== $query.data) img.src = $query.data;

		img.onload = () => {
			loading = false;
			loaded = true;
		};

		img.onerror = () => {
			loading = false;
			failed = true;
		};

		prevUrl = $query.data;
	});
</script>

{#if loading}
	<div class="placeholder aspect-square animate-pulse w-full h-full"></div>
{:else if failed && showOnFail}
	<p class="text-[18px] whitespace-pre-line break-all p-4 text-center">
		{itemName}
	</p>
{:else if loaded}
	<img
		class="h-full w-full object-cover rounded-none {imageClass}"
		draggable="false"
		src={prevUrl}
		alt={itemName}
	/>
{/if}
