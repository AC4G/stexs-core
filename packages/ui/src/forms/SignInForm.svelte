<script lang="ts">
	import { SignIn } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';
	import Input from '../components/Input/Input.svelte';
	import FormErrors from '../components/Form/FormErrors.svelte';
	import type StexsClient from 'stexs-client';
	import { goto } from '$app/navigation';
	import FormSubmit from '../components/Form/FormSubmit.svelte';

  interface Props {
		stexs: StexsClient;
  }

  let { stexs }: Props = $props();

	let formData = $state({
		identifier: '',
		password: '',
		remember: false,
	});
	let submitted: boolean = $state(false);

	const {
		form,
		errors,
		validateForm
	} = superForm(formData, {
		dataType: 'json',
		validators: zod(SignIn),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function signIn(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid) return;

		submitted = true;

		const response = await (
			await stexs.auth.signIn($form.identifier, $form.password, $form.remember)
		).json();

		if (response.token) return goto('/sign-in-confirm');

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
<form class="space-y-6" onsubmit={signIn}>
	<Input
		field="identifier"
		type="text"
		required
		bind:value={$form.identifier}>Username or Email</Input
	>
	<Input
		field="password"
		type="password"
		required
		bind:value={$form.password}>Password</Input
	>
	<div class="flex justify-between">
		<Input
			field="remember"
			inputClass="checkbox"
			labelClass="flex items-center space-x-2"
			type="checkbox"
			labelAfter={true}
			bind:checked={$form.remember}>Remember me</Input
		>
		<a
			href="/recovery"
			class="text-secondary-500 hover:text-secondary-400 transition"
			>Forgot password?</a
		>
	</div>
	<FormSubmit
		submitText="Sign In"
		submitBtnClass="w-fit"
		{submitted}
		submitOnly
	/>
</form>
