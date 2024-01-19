import type { ModalSettings, ModalStore, ToastSettings } from "@skeletonlabs/skeleton";
import type StexsClient from "stexs-client";
import type { Writable } from "svelte/store";

export function openCreateOrganizationModal(userId: string, flash: Writable<ToastSettings>, modalStore: ModalStore, stexs: StexsClient) {
    const modal: ModalSettings = {
        type: 'component',
        component: 'createOrganization',
        meta: {
            userId,
            flash,
            stexsClient: stexs
        }
    };
    modalStore.set([modal]);
}
