import type { ModalSettings, ModalStore } from '@skeletonlabs/skeleton';
import { stexs } from '../../../stexsClient';

export function openRemoveAvatarModal(
	modalStore: ModalStore,
	onSuccess: () => void,
) {
	const modal: ModalSettings = {
		type: 'component',
		component: 'confirm',
		meta: {
			question: `Do you really want to remove your avatar?`,
			fn: async () => {
				await stexs.storage.deleteAvatar();
				onSuccess();
			},
		},
	};
	modalStore.set([modal]);
}
