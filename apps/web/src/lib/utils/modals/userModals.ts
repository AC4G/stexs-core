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
      fn: blockUser,
      fnParams: {
        blocked_id: userId,
        blocker_id: currentUserId,
        username,
        flash,
        onSuccess,
      }
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
      fn: unblockUser,
      fnParams: {
        userId,
        currentUserId,
        username,
        flash,
        onSuccess,
      }
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

export function openSignOutFromAllSessionsModal(
  modalStore: ModalStore,
  openMFAModal: () => void
) {
  const modal: ModalSettings = {
    type: 'component',
    component: 'confirm',
    meta: {
      text: `Do you really want to sign out from all sessions?`,
      subText: 'Signing out from all sessions will log you out from all devices and browsers, including this one.',
      fn: openMFAModal,
      confirmBtnText: 'Continue',
      close: false
    },
  };
  modalStore.set([modal]);
}
