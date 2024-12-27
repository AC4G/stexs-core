<script lang="ts">
	import Button from '../components/Button/Button.svelte';
	import Input from '../components/Input/Input.svelte';
	import QR from '@svelte-put/qr/img/QR.svelte';
	import { VerifyCode } from 'validation-schemas';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { tick } from 'svelte';
	import StexsClient from 'stexs-client';
	import type { QueryObserverResult } from '@tanstack/svelte-query';
	import { setToast } from '../utils/toast';
	import { Modal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		stexs: StexsClient
		authQueryStore: QueryObserverResult;
		open: boolean;
	}

	let {
		stexs,
		authQueryStore,
		open = $bindable(false)
	}: Props = $props();

	let submitted = $state(false);
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

		const response = await stexs.auth.mfa.verify('totp', $form.code);

		if (response.ok) {
			setToast({
				title: 'Success',
				type: 'success',
				description: 'Authenticator app method successfully enabled.',
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

	const toggleShowSecret = () => {
		showSecret = !showSecret;
	};

	let totp: {
		secret: string;
		otp_auth_uri: string;
	} | undefined = $state();
	let showSecret: boolean = $state(false);

	async function onOpenChange(details: { open: boolean }) {
		if (!details.open) {
			totp = undefined;
			showSecret = false;

			return;
		};

		let response = await stexs.auth.mfa.enable('totp');

		if (!response.ok) {
			setToast({
				title: 'Error',
				type: 'error',
				description: 'Failed to initialize TOTP. Please try again.',
				duration: 5000,
			});

			closeModal();
		}

		totp = await response.json();

		await tick();

		codeInput.focus();
	}

	let secretHidden =
		$derived(totp && totp.secret.slice(0, 4) + '***' + totp.secret.slice(-4));

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
				<p class="text-[22px] text-primary-500">Authenticator App</p>
			</div>
			{#if totp}
				<div class="space-y-4 flex flex-col items-center">
					<QR
						data={totp.otp_auth_uri}
						shape="circle"
						anchorInnerFill="gray"
						anchorOuterFill="gray"
						moduleFill="gray"
						width="260"
						height="260"
						draggable="false"
					/>
					<p class="text-center">
						Scan the QR code above with your authenticator app and enter the
						generated code below.
					</p>
					<p class="text-center">Unable to scan the QR code?</p>
					<div
						class="flex space-x-2 items-center border border-surface-500 rounded-md p-2 max-w-[380px]"
					>
						<p class="text-center px-2 py-1 rounded-md break-all">
							{#if showSecret}{totp.secret}{:else}{secretHidden}{/if}
						</p>
						<Button
							onclick={toggleShowSecret}
							class="variant-ghost-surface px-2 py-1 h-fit"
						>
							{#if showSecret}Hide{:else}Show{/if}
						</Button>
					</div>
					<Button
						clipboardData={totp.secret}
						class="btn variant-ghost-secondary w-fit px-2 py-1"
						>Copy Secret</Button
					>
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
							{submitted}
							>Enable</Button
						>
					</div>
				</form>
			{:else}
				<div class="space-y-4 flex flex-col items-center">
					<div class="w-full max-w-[260px] h-[260px] placeholder animate-pulse"></div>
					<div class="w-full max-w-[340px] h-[60px] placeholder animate-pulse"></div>
					<div class="w-full max-w-[200px] h-[40px] placeholder animate-pulse"></div>
					<div class="w-full max-w-[200px] h-[40px] placeholder animate-pulse"></div>
					<div class="w-full max-w-[100px] h-[40px] placeholder animate-pulse"></div>
				</div>
				<div class="w-full max-w-[340px] h-[70px] placeholder animate-pulse"></div>
				<div class="flex justify-between w-full">
					<Button
						class="variant-ringed-surface hover:bg-surface-600"
						onclick={closeModal}>Cancel</Button
					>
					<div class="w-[88px] h-[42px] placeholder animate-pulse"></div>
				</div>
			{/if}
		</div>
	{/snippet}
</Modal>
