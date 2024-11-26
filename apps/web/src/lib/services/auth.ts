import { stexs } from '../../stexsClient';
import { goto } from '$app/navigation';

export async function handleSignInSetup(code: string | null, message: string | null, flash: any) {
    if ((code === 'success' || code === 'error') && message) {
        flash.set({
            message,
            classes: `variant-glass-${code}`,
            timeout: 5000,
        });
    }

    const session = stexs.auth.getSession();
    if (session) {
        goto('/');
        return false;
    }

    const signInInit = stexs.auth.getSignInInit();
    if (signInInit && new Date(signInInit.expires * 1000) > new Date()) {
        goto('/sign-in-confirm');
        return false;
    }

    return true;
}