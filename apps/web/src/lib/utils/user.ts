import { stexs } from '../../stexsClient';
import { setToast, type GenericResult } from 'ui';

export async function blockUser(params: {
	blocked_id: string;
	blocker_id: string;
	username: string;
	onSuccess: () => void;
}): Promise<GenericResult> {
	const { blocked_id, blocker_id, username, onSuccess } = params;
	const { error } = await stexs
		.from('blocked')
		.insert([{ blocker_id, blocked_id }]);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not block ${username}. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: `Blocked ${username}.`,
		duration: 5000,
	});

	onSuccess();

	return {
		success: true
	};
}

export async function unblockUser(params: {
	userId: string;
	currentUserId: string;
	username: string;
	onSuccess: () => void;
}): Promise<GenericResult> {
	const { userId, currentUserId, username, onSuccess } = params;
	const { error } = await stexs
		.from('blocked')
		.delete()
		.eq('blocked_id', userId)
		.eq('blocker_id', currentUserId);

	if (error) {
		setToast({
			title: 'Error',
			type: 'error',
			description: `Could not unblock ${username}. Try out again.`,
			duration: 5000,
		});

		return {
			success: false
		};
	}

	setToast({
		title: 'Success',
		type: 'success',
		description: `Unblocked ${username}.`,
		duration: 5000,
	});

	onSuccess();

	return {
		success: true
	};
}
