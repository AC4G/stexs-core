<script lang="ts">
	import { getPreviousPageStore } from '$lib/stores/previousPageStore';
	import { stexs } from '../../stexsClient';
	import { goto } from '$app/navigation';
	import type { SignInInit } from 'stexs-client/src/lib/types';
	import { redirectToPreviousPage } from '$lib/stores/previousPageStore';
	import { createQuery } from '@tanstack/svelte-query';
	import { MFA, setToast } from 'ui';
	import { signInInitSetup } from '$lib/services/auth';

	const previousPageStore = getPreviousPageStore();

	let signInInit: SignInInit | null = $state(null);
	let type: string = $state('_selection');
	let requested: boolean = false;
	let errors: string[] | undefined = $state();

	const signInConfirmSetupQuery = createQuery({
		queryKey: ['signInConfirmSetup'],
		queryFn: async () => signInInitSetup(previousPageStore),
	});

	$effect(() => {
		if ($signInConfirmSetupQuery.data) {
			signInInit = $signInConfirmSetupQuery.data;
		}
	})

	function checkSignInInit() {
		signInInit = stexs.auth.getSignInInit();

		if (!signInInit || new Date(signInInit.expires * 1000) < new Date()) {
			requested = false;

			setToast({
				title: 'Error',
				type: 'error',
				description: 'Your session has expired. Please sign in again.',
				duration: 5000
			});
			
			goto('/sign-in');
		}
	}

	async function signInConfirm(code: string) {
		checkSignInInit();

		const response = await (await stexs.auth.signInConfirm(type, code)).json();

		if (response.access_token) return redirectToPreviousPage(previousPageStore);

		errors = response.errors;
	}

	function cancelSignInConfirm() {
		stexs.auth.cancelSignInConfirm();
		goto('/sign-in');
	}
</script>

{#if $signInConfirmSetupQuery.data && signInInit}
	<div class="flex items-center justify-center h-full">
		<MFA
			{stexs}
			cancel={cancelSignInConfirm}
			confirm={signInConfirm}
			types={signInInit.types}
			confirmErrors={errors}
			bind:type
		/>
	</div>
{/if}
