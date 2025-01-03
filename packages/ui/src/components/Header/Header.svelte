<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { page } from '$app/stores';
	import Button from '../Button/Button.svelte';
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		sidebarRoutes: string[];
		drawerOpen: boolean;
		children?: Snippet;
	}

	let {
		sidebarRoutes,
		drawerOpen = $bindable(false),
		children
	}: Props = $props();

	const toggleDrawer = () => {
		drawerOpen = !drawerOpen;
	}
</script>

<AppBar>
	{#snippet lead()}

			<div class="flex items-center space-x-2">
				<Button
					onclick={toggleDrawer}
					class="{sidebarRoutes.find((route) =>
						$page.url.pathname.startsWith(route),
					)
						? 'lg:hidden'
						: 'xs:hidden'} p-2 border rounded border-surface-500 bg-surface-700"
				>
					<Icon icon="octicon:three-bars-16" width="18" />
				</Button>
				{#if $page.url.pathname === '/'}
					<h4 class="h4 tracking-wider mt-[2px] md:mt-0">STEXS</h4>
				{:else}
					<a href="/" class="h4 tracking-wider mt-[2px] md:mt-0">STEXS</a>
				{/if}
			</div>

	{/snippet}

	{#snippet trail()}
		{@render children?.()}
	{/snippet}
</AppBar>
