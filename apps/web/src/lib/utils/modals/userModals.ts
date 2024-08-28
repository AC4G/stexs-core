import type {
  ModalSettings,
  ModalStore,
  ToastSettings,
} from '@skeletonlabs/skeleton';
import { blockUser, unblockUser } from '../user';
import type { Writable } from 'svelte/store';
import StexsClient from 'stexs-client';

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

export function openChangePasswordModal(
  types: string[],
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore,
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'changePassword',
    meta: {
      stexs,
      flash,
      types
    },
  };
  modalStore.set([modal]);
}

export function openChangeEmailModal(
  email: string,
  types: string[],
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore,
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'changeEmail',
    meta: {
      stexs,
      flash,
      types,
      email
    },
  };
  modalStore.set([modal]);
}

export function openEnableTOTPModal(
  authQueryStore: any,
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'enableTOTP',
    meta: {
      authQueryStore,
      stexs,
      flash
    },
  };
  modalStore.set([modal]);
}

export function openRemoveTOTPModal(
  authQueryStore: any,
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'removeTOTP',
    meta: {
      authQueryStore,
      stexs,
      flash
    },
  };
  modalStore.set([modal]);
}

export function openDisableEmailModal(
  authQueryStore: any,
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'disableEmail',
    meta: {
      authQueryStore,
      stexs,
      flash
    },
  };
  modalStore.set([modal]);
}

export function openEnableEmailModal(
  authQueryStore: any,
  stexs: StexsClient,
  flash: Writable<ToastSettings>,
  modalStore: ModalStore
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'enableEmail',
    meta: {
      authQueryStore,
      stexs,
      flash
    },
  };
  modalStore.set([modal]);
}
