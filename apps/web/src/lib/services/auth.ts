import { stexs } from '../../stexsClient';
import { goto } from '$app/navigation';
import { setToast, type TreeViewNode } from 'ui';
import type { Session, SignInInit } from 'stexs-client/src/lib/types';
import { redirectToPreviousPage, setPreviousPage, type PreviousPageStore } from '$lib/stores/previousPageStore';
import type { Page } from '@sveltejs/kit';
import { scopesTreeViewNodes } from '$lib/utils/scopes';

const pleaseNotify = 'Please notify the application operator.';
const couldNotProceed = 'Authorization could not proceed due to the following issues:';

export async function signInSetup(code: string | null, message: string | null): Promise<boolean> {
    if ((code === 'success' || code === 'error') && message) {
        setToast({
            title: code === 'success' ? 'Success' : 'Error',
            type: code,
            description: message,
            duration: 5000,
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

export type AuthorizeSetupResult = {
    clientData: {
        id: number;
        name: string;
        client_id: string;
        organization_id: number;
        organization_name: string;
        project_id: number;
        project_name: string;
        created_at: string;
    };
    filteredNodes: TreeViewNode[];
    expandedNodes: string[] | undefined
} | false;

export async function authorizeSetup(
    clientId: string | null, 
    redirectUrl: string | null, 
    scopes: string[],
    page: Page<Record<string, string>, string | null>
): Promise<AuthorizeSetupResult> {
    let issues = [];

    if (!clientId) {
        issues.push('missing client ID');
    }

    if (scopes.length === 0) {
        issues.push('missing scope');
    }

    if (scopes.length === 1 && scopes[0] === '') {
        issues.push('missing scopes in the scope query parameter');
    }

    if (!redirectUrl) {
        issues.push('missing redirect URL');
    }

    if (issues.length > 0) {
        let formattedIssues = '';

        if (issues.length === 1) {
            formattedIssues = issues[0];
        } else {
            const lastIssue = issues.pop();
            formattedIssues = issues.join(', ') + ', and ' + lastIssue;
        }

        setToast({
            title: 'Error',
            type: 'error',
            description: `${couldNotProceed} ${formattedIssues}. ${pleaseNotify}`,
            duration: 10000,
        });

        goto('/');
        return false;
    }

    const session: Session = stexs.auth.getSession();

    if (!session) {
        setPreviousPage(page);

        goto('/sign-in');

        return false;
    }

    const responseClientData = await stexs.rpc(
        'get_oauth2_app_by_client_id',
        {
            client_id_param: clientId,
        },
    );

    if (responseClientData.error) {
        setToast({
            title: 'Error',
            type: 'error',
            description: `${couldNotProceed} ${responseClientData.error.message}. ${pleaseNotify}`,
            duration: 10000,
        });
        
        goto('/');

        return false;
    }

    if (responseClientData.data === 0) {
        setToast({
            title: 'Error',
            type: 'error',
            description: `${couldNotProceed} no client found by the provided client ID. ${pleaseNotify}`,
            duration: 10000,
        });

        goto('/');

        return false;
    }

    const clientData = responseClientData.data[0];

    const filteredNodes = scopesTreeViewNodes
        .map((node) => {
            const filteredNodes = node.nodes?.filter((node) =>
                scopes.includes(node.id),
            );
            
            return {
                ...node,
                nodes: filteredNodes,
            };
        })
        .filter(
            (node) =>
                (node.nodes && node.nodes.length > 0) || !node.nodes,
        );

    if (filteredNodes.length === 0) {
        setToast({
            title: 'Error',
            type: 'error',
            description: `${couldNotProceed} no valid scopes provided. ${pleaseNotify}`,
            duration: 10000,
        });
        
        goto('/');

        return false;
    }

    const totalNodesCount = filteredNodes.reduce((count, node) => {
        return count + (node.nodes ? node.nodes.length : 0);
    }, 0);

    const expandedNodes = totalNodesCount <= 6 ? filteredNodes.map((node) => node.id) : [];

    return {
        clientData,
        filteredNodes,
        expandedNodes
    };
}

export async function checkUserSignedIn(): Promise<boolean> {
    const session: Session = stexs.auth.getSession();

    if (session) {
        goto(`/${session?.user.username}`);

        return false;
    }

    return true;
}

export async function authorize(
    clientId: string,
    redirectUrl: string,
    scopes: string[],
    authState: string | null
) {
    const response = await stexs.auth.oauth.authorize(
        clientId!,
        redirectUrl!,
        scopes,
    );

    if (response.status === 204) {
        goto(`${redirectUrl}${authState && authState.length > 0 ? `?state=${authState}` : ''}`);

        return;
    }

    const body = await response.json();

    if (response.status !== 200) {
        if (body.errors && body.errors[0].code === 'CLIENT_NOT_FOUND') {
            setToast({
                title: 'Error',
                type: 'error',
                description: `${couldNotProceed} client does not exists by the provided client ID. ${pleaseNotify}`,
                duration: 10000,
            });

            return;
        }

        if (body.errors && body.errors[0].code === 'INVALID_REDIRECT_URL') {
            setToast({
                title: 'Error',
                type: 'error',
                description: `${couldNotProceed} the provided redirect URL does not match the client settings. ${pleaseNotify}`,
                duration: 10000,
            });

            return;
        }

        if (body.errors && body.errors[0].code === 'INVALID_SCOPES') {
            const invalidScopes = body.errors[0].data.scopes;

            let formattedScopes = '';

            if (invalidScopes.length === 1) {
                formattedScopes = invalidScopes[0];
            } else {
                const lastIssue = invalidScopes.pop();
                formattedScopes = invalidScopes.join(', ') + ', and ' + lastIssue;
            }

            setToast({
                title: 'Error',
                type: 'error',
                description: `${couldNotProceed} the following requested scopes are not configured in the client settings: ${formattedScopes}. ${pleaseNotify}`,
                duration: 10000,
            });

            return;
        }

        setToast({
            title: 'Error',
            type: 'error',
            description: `Authorization could not proceed due to internal server error. Please try again.`,
            duration: 10000,
        });
        
        return;
    }

    goto(`${redirectUrl}?code=${body.code}&expires=${body.expires}${authState && authState.length > 0 ? `&state=${authState}` : ''}`);
}
