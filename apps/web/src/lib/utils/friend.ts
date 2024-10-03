import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';
import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Profile } from '$lib/stores/profileStore';

export async function acceptFriendRequest(
	user_id: string,
	friend_id: string,
	username: string,
	flash: Writable<ToastSettings>,
	$profileStore: Profile,
): Promise<boolean> {
	let isFriend: boolean = false;
	const { error } = await stexs.from('friends').insert([{ user_id, friend_id }]);

	if (error) {
		flash.set({
			message: `Could not add ${username} as a friend. Try out again.`,
			classes: 'variant-glass-error',
			timeout: 5000,
		});
	} else {
		isFriend = true;
		$profileStore.refetchIsFriendFn();

		flash.set({
			message: `${username} is now your friend.`,
			classes: 'variant-glass-success',
			timeout: 5000,
		});
	}

	return isFriend;
}

export async function deleteFriendRequest(
	requesterId: string,
	addresseeId: string,
	flash: Writable<ToastSettings>,
	$profileStore: Profile,
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
			classes: 'variant-glass-error',
			timeout: 5000,
		});
	} else {
		gotFriendRequest = false;
		$profileStore.refetchIsFriendFn();
		flash.set({
			message: 'Friend request successfully deleted.',
			classes: 'variant-glass-success',
			timeout: 5000,
		});
	}

	return gotFriendRequest;
}

export async function removeFriend(
	userId: string,
	friendId: string,
	flash: Writable<ToastSettings>,
) {
	const { error } = await stexs
		.from('friends')
		.delete()
		.eq('user_id', userId)
		.eq('friend_id', friendId);

	if (error) {
		flash.set({
			message: 'Could not remove friend. Try out again.',
			classes: 'variant-glass-error',
			timeout: 5000,
		});
	} else {
		flash.set({
			message: 'Friend successfully removed.',
			classes: 'variant-glass-success',
			timeout: 5000,
		});
	}
}

export async function revokeFriendRequest(
	requesterId: string,
	addresseeId: string,
	flash: Writable<ToastSettings>,
) {
	const { error } = await stexs
		.from('friend_requests')
		.delete()
		.eq('requester_id', requesterId)
		.eq('addressee_id', addresseeId);

	if (error) {
		flash.set({
			message: 'Could not revoke friend request. Try out again.',
			classes: 'variant-glass-error',
			timeout: 5000,
		});
	} else {
		flash.set({
			message: 'Friend request successfully revoked.',
			classes: 'variant-glass-success',
			timeout: 5000,
		});
	}
}

export async function sendFriendRequest(
	username: string,
	requester_id: string,
	addressee_id: string,
	flash: Writable<ToastSettings>,
) {
	const { error } = await stexs
		.from('friend_requests')
		.insert([{ requester_id, addressee_id }]);

	if (error && error.code === '23505') {
		const { error } = await stexs.from('friends').insert([
			{
				user_id: requester_id,
				friend_id: addressee_id,
			},
		]);

		if (error) {
			flash.set({
				message: `Could not add ${username} as a friend. Try out again.`,
				classes: 'variant-glass-error',
				timeout: 5000,
			});
		} else {
			flash.set({
				message: `${username} is now your friend.`,
				classes: 'variant-glass-success',
				timeout: 5000,
			});
		}
	} else if (error) {
		flash.set({
			message: 'Could not send friend request. Try out again.',
			classes: 'variant-glass-error',
			timeout: 5000,
		});
	} else {
		flash.set({
			message: 'Friend request successfully send.',
			classes: 'variant-glass-success',
			timeout: 5000,
		});
	}
}
