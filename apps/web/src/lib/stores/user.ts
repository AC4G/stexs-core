import { writable } from 'svelte/store';

export interface User {
  userId: string;
  username: string;
}

export const user = writable<User | null>(null);
