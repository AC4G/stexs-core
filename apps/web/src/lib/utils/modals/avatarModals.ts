import type { ModalSettings, ModalStore } from '@skeletonlabs/skeleton';
import { stexs } from '../../../stexsClient';

export function openRemoveAvatarModal(
  modalStore: ModalStore,
  onSuccess: () => void
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'confirm',
    meta: {
      text: `Do you really want to remove your avatar?`,
      function: async () => {
        await stexs.storage.deleteAvatar();
        onSuccess();
      },
      fnAsync: true,
    },
  };
  modalStore.set([modal]);
}
