<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { stexs } from '../../stexsClient';
	import type { Session } from 'stexs-client/src/lib/types';
	import { goto } from '$app/navigation';
	import { getPreviousPageStore } from '$lib/stores/previousPageStore';
	import { page } from '$app/stores';
	
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const previousPageStore = getPreviousPageStore();

	const settingsSetupQuery = createQuery({
		queryKey: ['settingsSetup'],
		queryFn: async () => {
			const session: Session = stexs.auth.getSession();

			if (!session) {
				previousPageStore.set($page.url.pathname);
				goto('/sign-in');
				return false;
			}

			return session;
		},
	});
</script>

{#if $settingsSetupQuery.data}
	{@render children?.()}
{/if}
