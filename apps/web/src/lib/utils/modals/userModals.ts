import type { ModalSettings, ToastSettings } from "@skeletonlabs/skeleton";
import { blockUser, unblockUser } from "../user";
import type { Writable } from "svelte/store";

export function blockUserModal(userId: string, currentUserId: string, username: string, flash: Writable<ToastSettings>, modalStore: Writable<[ModalSettings]>) {
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
                flash
            },
            fnAsync: true
        }
    };
    modalStore.set([modal]);
}

export function unblockUserModal(userId: string, currentUserId: string, username: string, flash: Writable<ToastSettings>, modalStore: Writable<[ModalSettings]>) {
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
                flash
            },
            fnAsync: true
        }
    };
    modalStore.set([modal]);
}
