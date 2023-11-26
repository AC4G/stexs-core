import { writable } from 'svelte/store';

export interface User {
  id: string;
  username: string;
}

export const user = writable<User | null>(null);
