<script lang="ts">
	import StexsClient from 'stexs-client';
	import MFA from '../components/MFA/MFA.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { EmailChange, VerifyCode } from 'validation-schemas';
	import Input from '../components/Input/Input.svelte';
	import Button from '../components/Button/Button.svelte';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { setToast } from '../utils/toast';

	interface Props {
		stexs: StexsClient;
		types: string[];
		currentEmail: string;
		open: boolean;
	}

	let {
		stexs,
		types,
		currentEmail,
		open = $bindable(false),
	}: Props = $props();

	let type = $state('_selection');
	let newEmailEntered: boolean = $state(false);
	let mfaEntered: boolean = $state(false);
	let confirmErrors: { message: string }[] = $state([]);

	let codeInput: HTMLInputElement = $state();

	let emailChangeFormData = $state({
		email: '',
	});

	const {
		form,
		errors,
		validateForm
	} = superForm(emailChangeFormData, {
		id: 'email-change',
		dataType: 'json',
		validators: zod(EmailChange),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	let verifyFormData = $state({
		code: '',
	});

	const {
		form: verifyForm,
		errors: verifyErrors,
		validateForm: verifyValidateForm,
	} = superForm(verifyFormData, {
		id: 'verify-email-change',
		dataType: 'json',
		validators: zod(VerifyCode),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid || $errors._errors) return;

		if (currentEmail === $form.email) {
			$errors._errors = ['New email cannot be the same as current email.'];

			return;
		}

		newEmailEntered = true;
	}

	async function verify(event: SubmitEvent) {
		event.preventDefault();

		const result = await verifyValidateForm();

		if (!result.valid) return;

		const response = await stexs.auth.verifyEmailChange($verifyForm.code);

		if (response.ok) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'Email successfully changed.',
				duration: 5000
			});
			close();
			return;
		}

		const body = await response.json();

		if (body.errors[0].code === 'CODE_EXPIRED') {
			newEmailEntered = false;
			mfaEntered = false;

			$errors._errors = [body.errors[0].message];

			return;
		}

		body.errors.forEach((error: { message: string }) => {
			$verifyErrors._errors === undefined
				? ($verifyErrors._errors = [error.message])
				: $verifyErrors._errors.push(error.message);
			return;
		});
	}

	async function confirmMFA(code: string) {
		const response = await stexs.auth.changeEmail($form.email, code, type as 'totp' | 'email');

		if (response.ok) {
			mfaEntered = true;
			return;
		}

		const updateErrors = (await response.json()).errors;

		if (updateErrors[0].code === 'EMAIL_NOT_AVAILABLE') {
			updateErrors.forEach((error: { message: string }) => {
				$errors._errors = [error.message];
				return;
			});
			newEmailEntered = false;
			return;
		}

		confirmErrors = updateErrors;
	}

	function jumpToVerification() {
		newEmailEntered = true;
		mfaEntered = true;
	}

	$effect(() => {
		$verifyForm.code = $verifyForm.code.toUpperCase();
	});
	$effect(() => {
		if (newEmailEntered && mfaEntered && codeInput) codeInput.focus();
	});

	const closeModal = () => {
		open = false;
	};
</script>

<Modal
	bind:open
>
	{#snippet content()}
		{#if newEmailEntered}
			{#if mfaEntered}
				<div
					class="card p-5 space-y-6 flex flex-col relative max-w-[380px] w-full"
				>
					<div class="h-fit">
						<p class="text-[22px] text-primary-500">Verify Email Change</p>
					</div>
					{#if $verifyErrors._errors && Array.isArray($verifyErrors._errors)}
						<ul class="whitespace-normal text-[14px] text-error-400 text-center">
							{#each $verifyErrors._errors as error (error)}
								<li>{error}</li>
							{/each}
						</ul>
					{/if}
					<p class="text-center">Enter the code sent to the new email address</p>
					<form
						class="space-y-6"
						autocomplete="off"
						onsubmit={verify}
					>
						<Input
							name="code"
							field="code"
							required
							bind:value={$verifyForm.code}
							bind:ref={codeInput}>Code</Input
						>
						{#if $verifyErrors.code && Array.isArray($verifyErrors.code)}
							<ul class="whitespace-normal text-[14px] mt-2 text-error-400">
								{#each $verifyErrors.code as error (error)}
									<li>{error}</li>
								{/each}
							</ul>
						{/if}
						<div class="flex justify-between w-full">
							<Button
								class="variant-ringed-surface hover:bg-surface-600"
								onclick={close}>Cancel</Button
							>
							<Button type="submit" class="variant-filled-primary">Verify</Button>
						</div>
					</form>
				</div>
			{:else}
				<MFA
					{stexs}
					{types}
					cancel={close}
					confirm={confirmMFA}
					{confirmErrors}
					bind:type
				/>
			{/if}
		{:else}
			<div class="card p-5 space-y-6 flex flex-col relative max-w-[380px] w-full">
				<div class="h-fit">
					<p class="text-[22px] text-primary-500">Email Change</p>
				</div>
				{#if $errors._errors && Array.isArray($errors._errors)}
					<ul class="whitespace-normal text-[14px] text-error-400 text-center">
						{#each $errors._errors as error (error)}
							<li>{error}</li>
						{/each}
					</ul>
				{/if}
				<form class="space-y-6" onsubmit={submit}>
					<Input
						name="email"
						type="email"
						field="email"
						required
						bind:value={$form.email}>New Email</Input
					>
					<Button
						onclick={jumpToVerification}
						class="p-0 text-secondary-500 hover:text-secondary-400 w-fit"
						>Already issued email change?</Button
					>
					<div class="flex justify-between w-full">
						<Button
							class="variant-ringed-surface hover:bg-surface-600"
							onclick={closeModal}>Cancel</Button
						>
						<Button type="submit" class="variant-filled-primary">Continue</Button>
					</div>
				</form>
			</div>
		{/if}
	{/snippet}
</Modal>
