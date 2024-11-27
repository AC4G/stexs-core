import { getFlash } from 'sveltekit-flash-message/client';
import { page } from '$app/stores';
import type { ToastSettings } from '@skeletonlabs/skeleton';

export function setFlashMessage(settings: ToastSettings) {
    const flash = getFlash(page);
    flash.set(settings);
}
