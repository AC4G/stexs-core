import type {
  ModalSettings,
  ModalStore,
  ToastSettings,
} from '@skeletonlabs/skeleton';
import { blockUser, unblockUser } from '../user';
import type { Writable } from 'svelte/store';

export function openBlockUserModal(
  userId: string,
  currentUserId: string,
  username: string,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore,
  onSuccess: () => void,
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'confirm',
    meta: {
      text: `Do you really want to block ${username}?`,
      function: blockUser,
      fnParams: {
        blocked_id: userId,
        blocker_id: currentUserId,
        username,
        flash,
        onSuccess,
      },
      fnAsync: true,
    },
  };
  modalStore.set([modal]);
}

export function openUnblockUserModal(
  userId: string,
  currentUserId: string,
  username: string,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore,
  onSuccess: () => void,
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'confirm',
    meta: {
      text: `Do you really want to unblock ${username}?`,
      function: unblockUser,
      fnParams: {
        userId,
        currentUserId,
        username,
        flash,
        onSuccess,
      },
      fnAsync: true,
    },
  };
  modalStore.set([modal]);
}
