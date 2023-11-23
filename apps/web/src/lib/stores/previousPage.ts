import { writable } from 'svelte/store';
import { redirect } from '@sveltejs/kit';
import { goto } from '$app/navigation';

export const previousPage = writable<string>('/');

export function redirectToPreviousPage() {
  let path;

  const unsubscribe = previousPage.subscribe((currentPath) => {
    path = currentPath;
  });

  unsubscribe();

  previousPage.set('/');

  if (typeof window === 'undefined') throw redirect(302, path);

  return goto(path);
}
