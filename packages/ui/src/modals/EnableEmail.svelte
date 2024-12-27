<script lang="ts">
	import Button from '../components/Button/Button.svelte';
	import Input from '../components/Input/Input.svelte';
	import { VerifyCode } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import Icon from '@iconify/svelte';
	import StexsClient from 'stexs-client';
	import { setToast } from '../utils/toast';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import type { QueryObserverResult } from '@tanstack/svelte-query';

	interface Props {
		stexs: StexsClient;
		authQueryStore: QueryObserverResult;
		open: boolean;
	}

	let {
		stexs,
		authQueryStore,
		open = $bindable(false),
	}: Props = $props();

	let submitted: boolean = $state(false);
	let requested: boolean = $state(false);
	let codeInput: HTMLInputElement = $state();

	let formData = $state({
		code: '',
	});

	const {
		form,
		errors,
		validateForm
	} = superForm(formData, {
		dataType: 'json',
		validators: zod(VerifyCode),
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid) return;

		submitted = true;

		const response = await stexs.auth.mfa.enable('email', $form.code);

		if (response.ok) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'Email authentication method successfully enabled.',
				duration: 5000,
			});

			authQueryStore.refetch();
			closeModal();

			return;
		}

		const verificationErrors = (await response.json()).errors;

		verificationErrors.forEach((error: { message: string }) => {
			$errors._errors === undefined
				? ($errors._errors = [error.message])
				: $errors._errors.push(error.message);
		});

		submitted = false;
	}

	async function requestNewCode(showMessage: boolean = false) {
		const response = await (await stexs.auth.mfa.requestCode('email')).json();

		if (response.success && showMessage) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'New authentification code successfully requested.',
				duration: 5000,
			});

			return;
		}

		if (response.errors) {
			response.errors.forEach((error: { message: string }) => {
				$errors._errors === undefined
					? ($errors._errors = [error.message])
					: $errors._errors.push(error.message);
				return;
			});
		}
	}

	async function onOpenChange(details: { open: boolean }) {
		if (!details.open) {
			return;
		}

		codeInput.focus();

		await requestNewCode();
	}

	const closeModal = () => {
		open = false;
	}
</script>

<Modal
	bind:open
	{onOpenChange}
>
	{#snippet content()}
		<div class="card p-5 space-y-6 flex flex-col relative max-w-[380px] w-full">
			<div class="h-fit">
				<p class="text-[22px] text-primary-500">Email Authentication</p>
			</div>
			<p class="text-center">
				Enter the code sent to your email to enable email authentication.
			</p>
			<div class="flex justify-center w-full">
				<Button
					title="Resend code"
					class="variant-ghost-secondary"
					onclick={async () => {
						requested = true;
						await requestNewCode(true);
						requested = false;
					}}
					submitted={requested}
				>
					<Icon icon="tabler:reload" class="text-[24px]" />
				</Button>
			</div>
			{#if $errors._errors && Array.isArray($errors._errors)}
				<ul class="whitespace-normal text-[14px] text-error-400 text-center">
					{#each $errors._errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
			<form
				class="space-y-6"
				autocomplete="off"
				onsubmit={submit}
			>
				<Input
					name="code"
					field="code"
					required
					bind:value={$form.code}
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
						onclick={closeModal}>Cancel</Button
					>
					<Button
						type="submit"
						class="variant-filled-primary"
						{submitted}>Enable</Button>
				</div>
			</form>
		</div>
	{/snippet}
</Modal>
