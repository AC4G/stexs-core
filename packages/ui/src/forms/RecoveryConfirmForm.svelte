<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import { RecoveryConfirm } from 'validation-schemas';
	import { goto } from '$app/navigation';
	import { setToast } from '../utils/toast';
	import FormErrors from '../components/Form/FormErrors.svelte';
	import Input from '../components/Input/Input.svelte';
	import type StexsClient from 'stexs-client';
	import FormSubmit from '../components/Form/FormSubmit.svelte';

	interface Props {
		email: string;
		token: string;
		stexs: StexsClient;
		cancel: () => void;
	}

	let {
		email,
		token,
		stexs,
		cancel,
	}: Props = $props();

	let formData = $state({
		password: '',
		confirm: '',
	});
	let submitted: boolean = $state(false);

	const { form, errors, validateForm } = superForm(formData, {
		dataType: 'json',
		validators: zod(RecoveryConfirm),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function confirmRecovery(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid) return;

		submitted = true;

		const response = await (
			await stexs.auth.recoveryConfirm(email, token, $form.password)
		).json();

		if (response.success) {
			setToast({
				title: 'Success',
				description: response.message,
				type: 'success',
				duration: 10000
			});
			return goto('/sign-in');
		}

		response.errors.forEach((error: { message: string }) => {
			$errors._errors === undefined
				? ($errors._errors = [error.message])
				: $errors._errors.push(error.message);
			return;
		});

		submitted = false;
	}
</script>

<FormErrors errors={$errors._errors} />
<form
	class="space-y-6"
	autocomplete="off"
	onsubmit={confirmRecovery}
>
	<Input
		field="password"
		type="password"
		required
		bind:value={$form.password}>New Password</Input
	>
	<FormErrors errors={$errors.password} />
	<Input
		field="confirm"
		type="password"
		required
		bind:value={$form.confirm}>Confirm Password</Input
	>
	<FormErrors errors={$errors.confirm} />
	<FormSubmit
		submitText="Update Password"
		{submitted}
		{cancel}
	/>
</form>
