<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { Recovery } from 'validation-schemas';
	import { setToast } from '../utils/toast';
	import type StexsClient from 'stexs-client';
	import FormErrors from '../components/Form/FormErrors.svelte';
	import Input from '../components/Input/Input.svelte';
	import FormSubmit from '../components/Form/FormSubmit.svelte';

	interface Props {
		stexs: StexsClient;
		cancel: () => void;
	}

	let {
		stexs,
		cancel
	}: Props = $props();


	let formData = $state({
		email: '',
	});
  let submitted: boolean = $state(false);

	const { form, errors, validateForm } = superForm(formData, {
		dataType: 'json',
		validators: zod(Recovery),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function requestRecovery(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid) return;

		submitted = true;

		const response = await (
			await stexs.auth.recovery($form.email)
		).json();

		if (response.success) {
			setToast({
				title: 'Success',
				description: response.message,
				type: 'success',
				duration: 10000
			});
			submitted = false;
			return;
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
	onsubmit={requestRecovery}
>
	<Input
		field="email"
		type="email"
		required
		bind:value={$form.email}>Email</Input
	>
	<FormSubmit
		submitText="Request Recovery"
		{submitted}
		{cancel}
	/>
</form>
