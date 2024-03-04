import type { ModalSettings, ModalStore } from '@skeletonlabs/skeleton';
import { stexs } from '../../../stexsClient';
import { getState } from '$lib/stores/rerenderStore';
import type { Writable } from 'svelte/store';

export function openRemoveAvatarModal(
  userId: string,
  store: Writable<Record<string, boolean>>,
  modalStore: ModalStore,
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'confirm',
    meta: {
      text: `Do you really want to remove your avatar?`,
      function: async () => {
        await stexs.storage.deleteAvatar();
        const avatarState = getState(`avatars:${userId}`, store);

        avatarState.toggle();
      },
      fnAsync: true,
    },
  };
  modalStore.set([modal]);
}
