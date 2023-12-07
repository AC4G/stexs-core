import { writable } from 'svelte/store';

export const profile = writable<{
    userId: string,
    isPrivate: boolean,
    isFriend: boolean
}| null>(null);
