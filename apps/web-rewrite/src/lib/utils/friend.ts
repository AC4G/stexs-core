import { stexs } from '../../stexsClient';
import type { Profile } from '$lib/stores/profileStore';
import { setToast, type GenericResult } from 'ui';

export async function acceptFriendRequest(
	user_id: string,
	friend_id: string,
	username: string,
	$profileStore: Profile,
): Promise<GenericResult> {
	const { error } = await stexs
		.from('friends')
		.insert([
			{ 
				user_id, 
				friend_id 
			}
		]);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not add ${username} as a friend. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	$profileStore.refetchIsFriendFn();

	setToast({
		title: 'Success',
		type: 'success',
		description: `${username} is now your friend.`,
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function deleteFriendRequest(
	requesterId: string,
	addresseeId: string,
	$profileStore: Profile,
) {
	const { error } = await stexs
		.from('friend_requests')
		.delete()
		.eq('requester_id', requesterId)
		.eq('addressee_id', addresseeId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: 'Could not delete friend request. Try out again.',
			duration: 5000,
		});

		return {
			success: false
		};
	}

	$profileStore.refetchIsFriendFn();

	setToast({
		title: 'Success',
		type: 'success',
		description: 'Friend request successfully deleted.',
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function removeFriend(
	userId: string,
	friendId: string,
): Promise<GenericResult> {
	const { error } = await stexs
		.from('friends')
		.delete()
		.eq('user_id', userId)
		.eq('friend_id', friendId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: 'Could not remove friend. Try out again.',
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: 'Friend successfully removed.',
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function revokeFriendRequest(
	requesterId: string,
	addresseeId: string,
): Promise<GenericResult> {
	const { error } = await stexs
		.from('friend_requests')
		.delete()
		.eq('requester_id', requesterId)
		.eq('addressee_id', addresseeId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: 'Could not revoke friend request. Try out again.',
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: 'Friend request successfully revoked.',
		duration: 5000,
	});

	return {
		success: true
	};
}

export async function sendFriendRequest(
	username: string,
	requester_id: string,
	addressee_id: string,
): Promise<GenericResult> {
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
			setToast({
				title: 'Error',
				type: 'error',
				description: `Could not add ${username} as a friend. Try out again.`,
				duration: 5000,
			});

			return {
				success: false
			};
		}

		setToast({
			title: 'Success',
			type: 'success',
			description: `${username} is now your friend.`,
			duration: 5000,
		});

		return {
			success: true
		};
	}

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not send friend request. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: `Friend request successfully send to ${username}.`,
		duration: 5000,
	});

	return {
		success: true
	};
}
