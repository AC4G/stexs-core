import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

export interface User {
	id: string;
	username: string;
	email: string;
}

export function createUserStore(): Writable<User | null> {
	const user = writable<User | null>(null);
	setContext('userStore', user);
	return user;
}

export function getUserStore(): Writable<User | null> {
	return getContext<Writable<User | null>>('userStore');
}
