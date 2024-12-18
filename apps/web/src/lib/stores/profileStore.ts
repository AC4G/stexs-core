import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

export interface Profile {
	userId: string;
	isPrivate: boolean;
	isFriend: boolean | undefined;
	totalFriends: number;
	refetchProfileFn: () => Promise<void>;
	refetchFriendsFn: () => Promise<any>;
	refetchIsFriendFn: () => Promise<any>;
	refetchOrganizationsFn?: () => Promise<any>;
	refetchOrganizationAmountFn?: () => Promise<any>;
}

export function createProfileStore(): Writable<Profile | null> {
	const profile = writable<Profile | null>(null);
	setContext('profileStore', profile);
	return profile;
}

export function getProfileStore(): Writable<Profile | null> {
	return getContext<Writable<Profile | null>>('profileStore');
}
