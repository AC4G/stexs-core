<script lang="ts">
	import { type SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Button from '../Button.svelte';
	import Input from '../Input.svelte';
	import { VerifyCode } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import StexsClient from 'stexs-client';

	interface Props {
		parent: SvelteComponent;
	}

	let { parent }: Props = $props();

	const modalStore = getModalStore();

	let submitted = false;

	let authQueryStore = $modalStore[0].meta.authQueryStore;
	let stexs: StexsClient = $modalStore[0].meta.stexsClient;
	let flash = $modalStore[0].meta.flash;

	const { form, errors, validateForm } = superForm(zod(VerifyCode), {
		dataType: 'json',
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
			$flash = {
				message: 'Authenticator app method successfully removed.',
				classes: 'variant-glass-success',
				timeout: 5000,
			};
			authQueryStore.refetch();
			modalStore.close();
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

	const cancel = () => modalStore.close();
</script>

{#if $modalStore[0]}
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
					on:click={cancel}>Cancel</Button
				>
				<Button
					type="submit"
					class="variant-ghost-surface px-2 py-1 text-red-600">Remove</Button
				>
			</div>
		</form>
	</div>
{/if}
