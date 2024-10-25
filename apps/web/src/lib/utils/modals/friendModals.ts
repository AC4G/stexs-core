import type {
	ModalSettings,
	ModalStore,
	ToastSettings,
} from '@skeletonlabs/skeleton';
import type { Writable } from 'svelte/store';
import type StexsClient from 'stexs-client';
import { sendFriendRequest, revokeFriendRequest } from '../friend';

export function openAddFriendModal(
	userId: string,
	flash: Writable<ToastSettings>,
	modalStore: ModalStore,
	stexsClient: StexsClient,
	onSendFriendRequest: () => void,
) {
	const modal: ModalSettings = {
		type: 'component',
		component: 'addFriends',
		meta: {
			userId,
			flash,
			sendFriendRequest,
			revokeFriendRequest,
			stexsClient,
			onSendFriendRequest,
		},
	};
	modalStore.set([modal]);
}
