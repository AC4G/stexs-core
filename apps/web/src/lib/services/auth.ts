import { stexs } from '../../stexsClient';
import { goto } from '$app/navigation';
import { setFlashMessage } from 'ui';
import type { Session, SignInInit } from 'stexs-client/src/lib/types';
import { redirectToPreviousPage, type PreviousPageStore } from '$lib/stores/previousPageStore';

export async function signInSetup(code: string | null, message: string | null): Promise<boolean> {
    if ((code === 'success' || code === 'error') && message) {
        setFlashMessage({
            message,
            classes: `variant-glass-${code}`,
            timeout: 5000,
        });
    }

    const userSignedIn = await checkUserSignedIn();

    if (!userSignedIn) return false;

    const signInInit = stexs.auth.getSignInInit();
    if (signInInit && new Date(signInInit.expires * 1000) > new Date()) {
        goto('/sign-in-confirm');
        return false;
    }

    return true;
}

export async function signInInitSetup(previousPageStore: PreviousPageStore): Promise<SignInInit | null> {
    const userSignedIn = await checkUserSignedIn();

    if (!userSignedIn) return null;

    const signInInit = stexs.auth.getSignInInit();

    if (
        !signInInit ||
        (signInInit !== null &&
            new Date(signInInit.expires * 1000) < new Date())
    ) {
        redirectToPreviousPage(previousPageStore);

        return null;
    }

    return signInInit;
}

export async function checkUserSignedIn(): Promise<boolean> {
    const session: Session = stexs.auth.getSession();

    if (session) {
        goto(`/${session?.user.username}`);

        return false;
    }

    return true;
}
