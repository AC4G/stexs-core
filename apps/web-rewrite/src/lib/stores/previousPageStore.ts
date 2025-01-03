import { writable, type Writable } from 'svelte/store';
import { redirect, type Page } from '@sveltejs/kit';
import { goto } from '$app/navigation';
import { getContext, setContext } from 'svelte';

export type PreviousPageStore = Writable<string>;

export function createPreviousPageStore(): PreviousPageStore {
	const previousPage = writable<string>('/');
	setContext<PreviousPageStore>('previousPage', previousPage);
	return previousPage;
}

export function getPreviousPageStore(): PreviousPageStore {
	return getContext<PreviousPageStore>('previousPage');
}

export function redirectToPreviousPage(previousPageStore: PreviousPageStore) {
	let path: string = '/';

	const unsubscribe = previousPageStore.subscribe((currentPath: string) => {
		path = currentPath;
	});

	unsubscribe();

	previousPageStore.set('/');

	if (typeof window === 'undefined') redirect(302, path);

	return goto(path);
}

export function setPreviousPage(
	page: Page<Record<string, string>, string | null>,
	path: string | null = null
) {
	const previousPageStore = getPreviousPageStore();

	if (!path) {
		previousPageStore.set(
			page.url.pathname + '?' + page.url.searchParams,
		);
		return;
	}

	previousPageStore.set(path);
}
