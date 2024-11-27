<script lang="ts">
	import { page } from '$app/stores';
	import { validate as uuidValidate, version as uuidVersion } from 'uuid';
	import { stexs } from '../../stexsClient';
	import { isEmailValid } from '$lib/utils/validation';
	import { Card, CardHeader, RecoveryConfirmForm, RecoveryForm } from 'ui';
	import { goto } from '$app/navigation';

	let confirm: boolean = $state(false);

	const email = $page.url.searchParams.get('email');
	const token = $page.url.searchParams.get('token');

	if (
		email &&
		isEmailValid(email) &&
		token &&
		uuidValidate(token) &&
		uuidVersion(token) === 4
	) {
		confirm = true;
	}

	function cancel() {
		goto('/sign-in');
	}
</script>

<Card cardMaxWidth="max-w-[340px]">
	<CardHeader header="Password Recovery">
		<p class="text-[16px]">
			{#if confirm}
				Choose a new password for {email}.
			{:else}
				Enter your email to receive a recovery link. Make sure it's the email linked to your account.
			{/if}
		</p>
	</CardHeader>
	{#if confirm}
		<RecoveryConfirmForm {stexs} {cancel} {email} {token} />
	{:else}
		<RecoveryForm {stexs} {cancel} />
	{/if}
</Card>
