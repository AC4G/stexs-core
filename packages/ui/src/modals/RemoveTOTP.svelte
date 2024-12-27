<script lang="ts">
	import Button from '../components/Button/Button.svelte';
	import Input from '../components/Input/Input.svelte';
	import { VerifyCode } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import StexsClient from 'stexs-client';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { setToast } from '../utils/toast';
	import type { QueryObserverResult } from '@tanstack/svelte-query';

	interface Props {
		stexs: StexsClient;
		authQueryStore: QueryObserverResult;
		open: boolean;
	}

	let {
		stexs,
		authQueryStore,
		open = $bindable(false)
	}: Props = $props();

	let submitted = $state(false);
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

		const response = await stexs.auth.mfa.disable('totp', $form.code);

		if (response.ok) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'Authenticator app method successfully removed.',
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

	function closeModal() {
		open = false;
	}
</script>

<Modal
	bind:open
>
	{#snippet content()}
		<div class="card p-5 space-y-6 flex flex-col relative max-w-[380px] w-full">
			<div class="h-fit">
				<p class="text-[22px] text-primary-500">Authenticator App</p>
			</div>
			<p class="text-center">Enter code to remove authenticator app method.</p>
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
				<Input name="code" field="code" required bind:value={$form.code}
					>Code</Input
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
						{submitted}
						class="variant-ghost-surface px-2 py-1 text-red-600">Remove</Button
					>
				</div>
			</form>
		</div>
	{/snippet}
</Modal>
