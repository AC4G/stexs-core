import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

export interface Profile { 
  userId: string;
  isPrivate: boolean;
  isFriend: boolean;
  totalFriends: number;
  refetchTrigger?: boolean;
};

export function createProfileStore(): Writable<Profile | null> {
  const profile = writable<Profile | null>(null);
  setContext('profileStore', profile);
  return profile;
}

export function getProfileStore(): Writable<Profile | null> {
  return getContext<Writable<Profile | null>>('profileStore');
}
