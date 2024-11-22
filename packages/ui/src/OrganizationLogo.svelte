<script lang="ts">
	import { run } from 'svelte/legacy';

	import Icon from '@iconify/svelte';
	import { createQuery } from '@tanstack/svelte-query';

	interface Props {
		stexs: any;
		alt: string;
		organizationId: number;
		iconClass?: string;
		[key: string]: any
	}

	let {
		stexs,
		alt,
		organizationId,
		iconClass = 'text-[46px] rounded-md',
		...rest
	}: Props = $props();

	let loading: boolean = $state(true);
	let loaded: boolean = $state(false);
	let failed: boolean = $state(false);
	let prevUrl: string = $state('');

	const query = createQuery({
		queryKey: ['organizationLogo', organizationId],
		queryFn: async () => {
			return await stexs.storage.getOrganizationLogoUrl(organizationId);
		},
	});

	const img = $state(new Image());

	run(() => {
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
	<div class="placeholder animate-pulse w-full h-full"></div>
{:else if failed}
	<Icon icon="uil:image-question" class={iconClass} />
{:else if loaded}
	<img
		class="h-full w-full object-cover aspect-square {rest.class} rounded-none"
		draggable="false"
		src={prevUrl}
		{alt}
	/>
{/if}
