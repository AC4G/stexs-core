import { writable, type Writable } from 'svelte/store';
import { redirect } from '@sveltejs/kit';
import { goto } from '$app/navigation';
import { getContext, setContext } from 'svelte';

export function createPreviousPageStore(): Writable<string> {
  const previousPage = writable<string>('/');
  setContext<Writable<string>>('previousPage', previousPage);
  return previousPage;
}

export function getPreviousPageStore(): Writable<string> {
  return getContext<Writable<string>>('previousPage');
}

export function redirectToPreviousPage(previousPageStore: Writable<string>) {
  let path: string = '/';

  const unsubscribe = previousPageStore.subscribe((currentPath: string) => {
    path = currentPath;
  });

  unsubscribe();

  previousPageStore.set('/');

  if (typeof window === 'undefined') throw redirect(302, path);

  return goto(path);
}
