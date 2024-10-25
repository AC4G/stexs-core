import type {
	ModalSettings,
	ModalStore,
} from '@skeletonlabs/skeleton';
import StexsClient from 'stexs-client';

export function openDeleteConnectionModal(
    connectionName: string,
    modalStore: ModalStore,
    deleteConnectionFn: () => Promise<any>,
) {
    const modal: ModalSettings = {
		type: 'component',
		component: 'confirm',
		meta: {
			question: `Are you sure you want to revoke access for the '${connectionName}' app from your account?`,
			subText:
				'You will be signed out from this app, and it will no longer be able to perform actions on your behalf. If you wish to use this app again, you will need to authorize it once more.',
			fn: deleteConnectionFn,
			confirmBtnText: 'Revoke'
		},
	};
	modalStore.set([modal]);
}

export function openConnectionScopesModal(connection: {
	id: number;
	oauth2_apps: {
		name: string,
		organizations: {
			id: number
			name: string
		},
		projects: {
			name: string
		} | null
	}
}, stexsClient: StexsClient, modalStore: ModalStore) {
	const modal: ModalSettings = {
		type: 'component',
		component: 'connectionScopes',
		meta: {
			connection,
			stexsClient,
		}
	};
	modalStore.set([modal]);
}
