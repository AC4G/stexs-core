import { writable } from 'svelte/store';

export const previousPage = writable<string>('/');
