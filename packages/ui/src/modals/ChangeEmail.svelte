<script lang="ts">
	import { run, preventDefault } from 'svelte/legacy';

	import StexsClient from 'stexs-client';
	import { type SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import MFA from '../MFA.svelte';
	import { superForm, superValidateSync } from 'sveltekit-superforms/client';
	import { EmailChange, VerifyCode } from 'validation-schemas';
	import Input from '../Input.svelte';
	import Button from '../Button.svelte';

	interface Props {
		parent: SvelteComponent;
	}

	let { parent }: Props = $props();

	const modalStore = getModalStore();

	let stexs: StexsClient = $modalStore[0].meta.stexsClient;
	let flash = $modalStore[0].meta.flash;
	let types = $modalStore[0].meta.types;
	let type = $state('_selection');
	let currentEmail: string = $modalStore[0].meta.email;
	let newEmailEntered: boolean = $state(false);
	let mfaEntered: boolean = $state(false);
	let confirmErrors: string[] = [];

	let codeInput: HTMLInputElement = $state();

	const { form, errors, validate } = superForm(superValidateSync(EmailChange), {
		id: 'email-change',
		validators: EmailChange,
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	const {
		form: verifyForm,
		errors: verifyErrors,
		validate: verifyValidate,
	} = superForm(superValidateSync(VerifyCode), {
		id: 'verify-email-change',
		validators: VerifyCode,
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function submit() {
		const result = await validate();

		if (!result.valid || $errors._errors) return;

		if (currentEmail === $form.email) {
			$errors._errors = ['New email cannot be the same as current email.'];
			return;
		}

		newEmailEntered = true;
	}

	async function verify() {
		const result = await verifyValidate();

		if (!result.valid) return;

		const response = await stexs.auth.verifyEmailChange($verifyForm.code);

		if (response.ok) {
			$flash = {
				message: 'Email successfully changed.',
				classes: 'variant-glass-success',
				timeout: 5000,
			};
			cancel();
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
		const response = await stexs.auth.changeEmail($form.email, code, type);

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

	const cancel = () => modalStore.close();

	run(() => {
		$verifyForm.code = $verifyForm.code.toUpperCase();
	});
	run(() => {
		if (newEmailEntered && mfaEntered && codeInput) codeInput.focus();
	});
</script>

{#if $modalStore[0]}
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
					onsubmit={preventDefault(verify)}
				>
					<Input
						name="code"
						field="code"
						required
						bind:value={$verifyForm.code}
						bind:ref={codeInput}>Code</Input
					>
					{#if $errors.code && Array.isArray($errors.code)}
						<ul class="whitespace-normal text-[14px] mt-2 text-error-400">
							{#each $errors.code as error (error)}
								<li>{error}</li>
							{/each}
						</ul>
					{/if}
					<div class="flex justify-between w-full">
						<Button
							class="variant-ringed-surface hover:bg-surface-600"
							on:click={cancel}>Cancel</Button
						>
						<Button type="submit" class="variant-filled-primary">Verify</Button>
					</div>
				</form>
			</div>
		{:else}
			<MFA {stexs} {flash} {types} {cancel} confirm={confirmMFA} bind:type />
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
			<form class="space-y-6" onsubmit={preventDefault(submit)}>
				<Input
					name="email"
					type="email"
					field="email"
					required
					bind:value={$form.email}>New Email</Input
				>
				<Button
					on:click={jumpToVerification}
					class="p-0 text-secondary-500 hover:text-secondary-400 w-fit"
					>Already issued email change?</Button
				>
				<div class="flex justify-between w-full">
					<Button
						class="variant-ringed-surface hover:bg-surface-600"
						on:click={cancel}>Cancel</Button
					>
					<Button type="submit" class="variant-filled-primary">Continue</Button>
				</div>
			</form>
		</div>
	{/if}
{/if}
