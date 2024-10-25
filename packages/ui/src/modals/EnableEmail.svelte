<script lang="ts">
	import { onMount, type SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Button from '../Button.svelte';
	import Input from '../Input.svelte';
	import { VerifyCode } from 'validation-schemas';
	import { superForm, superValidateSync } from 'sveltekit-superforms/client';
	import Icon from '@iconify/svelte';
	import StexsClient from 'stexs-client';

	export let parent: SvelteComponent;

	const modalStore = getModalStore();

	let submitted: boolean = false;
	let requested: boolean = false;
	let codeInput: HTMLInputElement;

	let authQueryStore = $modalStore[0].meta.authQueryStore;
	let stexs: StexsClient = $modalStore[0].meta.stexsClient;
	let flash = $modalStore[0].meta.flash;

	const { form, errors, validate } = superForm(superValidateSync(VerifyCode), {
		validators: VerifyCode,
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function submit() {
		const result = await validate();

		if (!result.valid) return;

		submitted = true;

		const response = await stexs.auth.mfa.enable('email', $form.code);

		if (response.ok) {
			$flash = {
				message: 'Email authentication method successfully enabled.',
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

	async function requestNewCode(showMessage: boolean = false) {
		const response = await (await stexs.auth.mfa.requestCode('email')).json();

		requested = false;

		if (response.success && showMessage) {
			$flash = {
				message: 'New authentification code successfully requested.',
				classes: 'variant-glass-success',
				timeout: 5000,
			};
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

	onMount(async () => {
		codeInput.focus();

		const response = await (await stexs.auth.mfa.requestCode('email')).json();

		if (response.errors) {
			response.errors.forEach((error: { message: string }) => {
				$errors._errors === undefined
					? ($errors._errors = [error.message])
					: $errors._errors.push(error.message);
				return;
			});
		}
	});

	const cancel = () => modalStore.close();
</script>

{#if $modalStore[0]}
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
				on:click={async () => {
					requested = true;
					await requestNewCode(true);
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
			on:submit|preventDefault={submit}
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
					on:click={cancel}>Cancel</Button
				>
				<Button type="submit" class="variant-filled-primary">Enable</Button>
			</div>
		</form>
	</div>
{/if}
