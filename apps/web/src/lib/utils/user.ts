import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Writable } from 'svelte/store';
import { stexs } from '../../stexsClient';

export async function blockUser(params: {
	blocked_id: string;
	blocker_id: string;
	username: string;
	flash: Writable<ToastSettings>;
	onSuccess: () => void;
}) {
	const { blocked_id, blocker_id, username, flash, onSuccess } = params;
	const { error } = await stexs
		.from('blocked')
		.insert([{ blocker_id, blocked_id }]);

	if (error) {
		flash.set({
			message: `Could not block ${username}. Try out again.`,
			classes: 'variant-glass-error',
			timeout: 5000,
		});

		return;
	}

	flash.set({
		message: `Blocked ${username}.`,
		classes: 'variant-glass-success',
		timeout: 5000,
	});

	onSuccess();
}

export async function unblockUser(params: {
	userId: string;
	currentUserId: string;
	username: string;
	flash: Writable<ToastSettings>;
	onSuccess: () => void;
}) {
	const { userId, currentUserId, username, flash, onSuccess } = params;
	const { error } = await stexs
		.from('blocked')
		.delete()
		.eq('blocked_id', userId)
		.eq('blocker_id', currentUserId);

	if (error) {
		flash.set({
			message: `Could not unblock ${username}. Try out again.`,
			classes: 'variant-glass-error',
			timeout: 5000,
		});

		return;
	}

	flash.set({
		message: `Unblocked ${username}.`,
		classes: 'variant-glass-success',
		timeout: 5000,
	});

	onSuccess();
}
