<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton';
	import { page } from '$app/stores';
	import Button from '../Button/Button.svelte';

	interface Props {
		sidebarRoutes: string[];
		drawerStore: any;
		children: any;
	}

	let { 
		sidebarRoutes, 
		drawerStore, 
		children 
	}: Props = $props();
</script>

<AppBar
	gridColumns="grid-cols-3"
	slotDefault="place-self-center"
	slotTrail="place-content-end"
	class="h-[70px] flex justify-center border-b border-surface-500"
>
	{#snippet lead()}
	
			<div class="flex items-center space-x-2">
				<Button
					on:click={() => drawerStore.open({})}
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
