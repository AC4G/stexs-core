import type { ModalSettings, ModalStore, ToastSettings } from "@skeletonlabs/skeleton";
import type StexsClient from "stexs-client";
import type { Writable } from "svelte/store";

export function openCreateOrganizationModal(flash: Writable<ToastSettings>, modalStore: ModalStore, stexs: StexsClient, organizationsMemberStore: any) {
    const modal: ModalSettings = {
        type: 'component',
        component: 'createOrganization',
        meta: {
            flash,
            stexsClient: stexs,
            organizationsMemberStore
        }
    };
    modalStore.set([modal]);
}
