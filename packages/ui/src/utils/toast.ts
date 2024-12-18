import type { ToastContext } from "@skeletonlabs/skeleton-svelte";
import { getContext } from "svelte";

export interface Toast {
    id?: string;
    title?: string;
    description?: string;
    type?: 'info' | 'error' | 'success';
    duration?: number;
}

export function setToast(settings: Toast) {
    const toast = getContext('toast') as ToastContext;
    toast.create(settings);
}
