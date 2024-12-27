<script lang="ts">
	import MFA from '../components/MFA/MFA.svelte';
	import Input from '../components/Input/Input.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { UpdatePassword } from 'validation-schemas';
	import Button from '../components/Button/Button.svelte';
	import StexsClient from 'stexs-client';
	import { setToast } from '../utils/toast';
	import { Modal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		stexs: StexsClient;
		types: string[];
		open: boolean;
	}

	let {
		stexs,
		types,
		open = $bindable(false),
	}: Props = $props();

	let newPasswordEntered: boolean = $state(false);
	let confirmErrors: string[] = [];
	let type: string = $state('_selection');

	const { form, errors, validateForm } = superForm(zod(UpdatePassword),
		{
			dataType: 'json',
			validationMethod: 'oninput',
			clearOnSubmit: 'none',
		},
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();

		const result = await validateForm();

		if (!result.valid || $errors._errors) return;

		newPasswordEntered = true;
	}

	async function confirm(code: string) {
		const response = await stexs.auth.updatePassword(
			$form.password,
			code,
			type as 'totp' | 'email',
		);

		if (response.ok) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'Password successfully changed.',
				duration: 5000,
			});
			open = false;
			return;
		}

		const updateErrors = (await response.json()).errors;

		if (updateErrors[0].code === 'NEW_PASSWORD_EQUALS_CURRENT') {
			updateErrors.forEach((error: { message: string }) => {
				$errors._errors = [error.message];
				return;
			});
			newPasswordEntered = false;
			return;
		}

		confirmErrors = updateErrors;
	}

	const cancel = () => {
		open = false;
	};
</script>

<Modal
	bind:open
>
	{#snippet content()}
		{#if newPasswordEntered}
			<MFA
				{stexs}
				{types}
				{cancel}
				{confirm}
				bind:type
			/>
		{:else}
			<div class="card p-5 space-y-6 flex flex-col relative max-w-[380px]">
				<div class="h-fit">
					<p class="text-[22px] text-primary-500">Password Change</p>
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
					<div class="w-full">
						<Input
							name="password"
							type="password"
							field="password"
							required
							bind:value={$form.password}>New Password</Input
						>
						{#if $errors.password && Array.isArray($errors.password)}
							<ul class="whitespace-normal text-[14px] mt-2 text-error-400">
								{#each $errors.password as error (error)}
									<li>{error}</li>
								{/each}
							</ul>
						{/if}
					</div>
					<div class="w-full">
						<Input
							name="confirm"
							type="password"
							field="confirm"
							required
							bind:value={$form.confirm}>Confirm Password</Input
						>
						{#if $errors.confirm}
							<p class="whitespace-normal text-[14px] mt-2 text-error-400">
								{$errors.confirm}
							</p>
						{/if}
					</div>
					<div class="flex justify-between w-full">
						<Button
							class="variant-ringed-surface hover:bg-surface-600"
							onclick={cancel}>Cancel</Button
						>
						<Button type="submit" class="variant-filled-primary">Continue</Button>
					</div>
				</form>
			</div>
		{/if}
	{/snippet}
</Modal>
