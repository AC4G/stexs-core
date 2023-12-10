import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';
import type { ToastSettings } from '@skeletonlabs/skeleton';
import { profile } from '$lib/stores/profile';

export async function acceptFriendRequest(
  user_id: string,
  friend_id: string,
  username: string,
  flash: Writable<ToastSettings>,
): Promise<boolean> {
  let isFriend: boolean = false;
  const { error } = await stexs
    .from('friends')
    .insert([{ user_id, friend_id }]);

  if (error) {
    flash.set({
      message: `Could not add ${username} as a friend. Try out again.`,
      classes: 'variant-ghost-error',
      timeout: 5000,
    });
  } else {
    isFriend = true;
    profile.set({ isFriend: true });
    flash.set({
      message: `${username} is now your friend.`,
      classes: 'variant-ghost-success',
      timeout: 5000,
    });
  }

  return isFriend;
}

export async function deleteFriendRequest(
  requesterId: string,
  addresseeId: string,
  flash: Writable<ToastSettings>,
) {
  let gotFriendRequest: boolean = true;
  const { error } = await stexs
    .from('friend_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('addressee_id', addresseeId);

  if (error) {
    flash.set({
      message: 'Could not delete friend request. Try out again.',
      classes: 'variant-ghost-error',
      timeout: 5000,
    });
  } else {
    gotFriendRequest = false;
    flash.set({
      message: 'Friend request successfully deleted.',
      classes: 'variant-ghost-success',
      timeout: 5000,
    });
  }

  return gotFriendRequest;
}
