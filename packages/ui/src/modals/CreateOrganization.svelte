<script lang="ts">
	import Button from '../components/Button/Button.svelte';
	import Icon from '@iconify/svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { CreateOrganization } from 'validation-schemas';
	import Markdown from '../components/Markdown/Markdown.svelte';
	import Input from '../components/Input/Input.svelte';
	import lodash, { isArray } from 'lodash';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import StexsClient from 'stexs-client';
	import type { QueryObserverResult } from '@tanstack/svelte-query';
	import { setToast } from '../utils/toast';

	const { debounce } = lodash;

	interface Props {
		stexs: StexsClient;
		organizationsMemberStore: QueryObserverResult;
		open: boolean;
	}

	let {
		stexs,
		organizationsMemberStore,
		open = $bindable(false),
	}:Props = $props();

	let submitted: boolean = $state(false);
	let preview: boolean = $state(false);
	let hasChanges: boolean = $state(false);
	let hasErrors: boolean = $state(false);
	let nameNotAvailable: boolean = $state(false);
	let checkedNames: {
		name: string;
		available: boolean
	}[] = [];
	let nameInput: HTMLInputElement = $state();

	const checkNameAvailability = debounce(async () => {
		if ($errors.name || $form.name.length === 0) return;

		const name = $form.name.toLowerCase();

		const checkExists = checkedNames.find((check) => check.name === name);

		if (checkExists) {
			if (checkExists.available) {
				nameNotAvailable = false;
			} else {
				nameNotAvailable = true;
			}

			return;
		}

		const { count } = await stexs
			.from('organizations')
			.select('', {
				count: 'exact',
				head: true,
			})
			.ilike('name', name);

		let available: boolean = true;

		if (count === 1) {
			nameNotAvailable = true;
			available = false;
		} else {
			nameNotAvailable = false;
		}

		checkedNames.push({
			name,
			available,
		});
	}, 300);

	let formData = $state({
		name: null,
		display_name: null,
		description: null,
		email: null,
		url: null,
		readme: null,
	});

	const {
		form,
		errors,
		validateForm
	} = superForm(formData,
		{
			dataType: 'json',
			validators: zod(CreateOrganization),
			validationMethod: 'oninput',
			clearOnSubmit: 'none',
		},
	);
	const formKeys = Object.keys($form);

	async function resetForm() {
		form.set({
			name: null,
			display_name: null,
			description: null,
			email: null,
			url: null,
			readme: null,
		});
		nameNotAvailable = false;

		await new Promise((resolve) => setTimeout(resolve, 0));

		errors.clear();
	}

	async function createOrganization() {
		const result = await validateForm();

		if (!result.valid) return;

		submitted = true;

		const cleanedForm = Object.fromEntries(
			Object.entries($form).filter(([_, value]) => value !== null),
		);

		const { error } = await stexs.from('organizations').insert(cleanedForm);

		if (error) {
			if (error.code === '23505') {
				$errors.name = [
					'The name has already been taken. Please choose a different one.',
				];
			} else {
				$errors._errors = [error.message];
			}
		} else {
			setToast({
				title: 'Success',
				type: 'success',
				description: `${$form.name} organization was been successfully created.`,
				duration: 5000,
			});
			organizationsMemberStore.refetch();
			closeModal();
		}

		submitted = false;
	}

	$effect(() => {
		if ($form.email?.length === 0 && isArray($errors.email) && $errors.email.length > 0) {
			$errors.email = [];
		}
	});

	$effect(() => {
		let countChanges: number = 0;

		for (let key of formKeys) {
			// @ts-ignore
			if ($form[key] !== null) {
				countChanges++;
			}
		}

		if (countChanges > 0) {
			hasChanges = true;
		} else {
			hasChanges = false;
		}
	});

	// $errors in if st. only for reactivity
	$effect(() => {
		if ($errors && hasChanges) {
			(async () => (hasErrors = !(await validateForm()).valid))();
		}
	});

	function onOpenChange(details: { open: boolean }) {
		if (!details.open) {
			resetForm();

			return;
		}

		nameInput.focus();
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
		<div
			class="card p-3 sm:p-5 space-y-6 flex flex-col max-w-[600px] w-full relative"
		>
			<div>
				<div class="absolute right-[8px] top-[8px]">
					<Button onclick={closeModal} class="p-3 variant-ghost-surface">
						<Icon icon="ph:x-bold" />
					</Button>
				</div>
				<div class="h-fit w-[85%]">
					<p class="text-[22px] text-primary-500">Setup your Organization</p>
				</div>
			</div>
			{#if $errors._errors && Array.isArray($errors._errors)}
				<div class="mt-2">
					<ul class="whitespace-normal text-[12px] text-error-400 text-center">
						{#each $errors._errors as error (error)}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			{/if}
			<form class="space-y-6" onsubmit={createOrganization}>
				<div>
					<label for="name" class="label">
						<span class="flex flex-row gap-x-2"
							>Name
							<p class="text-red-500">*</p></span
						>
						<Input
							id="name"
							class="input"
							type="text"
							required
							bind:ref={nameInput}
							bind:value={$form.name}
							oninput={checkNameAvailability}
						/>
					</label>
					{#if $errors.name || nameNotAvailable}
						<div class="mt-2">
							{#if $errors.name && Array.isArray($errors.name)}
								<ul class="whitespace-normal text-[14px] text-error-400">
									{#each $errors.name as error (error)}
										<li>{error}</li>
									{/each}
								</ul>
							{/if}
							{#if nameNotAvailable}
								<p class="text-[14px] text-error-400 whitespace-normal">
									Name is already being used
								</p>
							{/if}
						</div>
					{/if}
				</div>
				<div>
					<label for="display name" class="label">
						<span>Display Name</span>
						<Input
							id="displayName"
							class="input"
							type="text"
							bind:value={$form.display_name}
						/>
					</label>
					{#if $errors.display_name}
						<div class="mt-2">
							<p class="whitespace-normal text-[14px] text-error-400">
								{$errors.display_name}
							</p>
						</div>
					{/if}
				</div>
				<div>
					<label for="description" class="label">
						<span>Description</span>
						<textarea
							id="description"
							rows="3"
							class="input"
							placeholder="Short description of your organization"
							bind:value={$form.description}
						></textarea>
					</label>
					{#if $errors.description}
						<div class="mt-2">
							<p class="whitespace-normal text-[14px] text-error-400">
								{$errors.description}
							</p>
						</div>
					{/if}
				</div>
				<div>
					<label for="readme" class="label">
						<div class="flex flex-row space-x-2 items-center">
							<span>README</span>
							<Button
								type="button"
								class="btn px-1 chip variant-ghost-surface"
								onclick={() => {
									preview = !preview
								}}
								>{preview ? 'Hide Preview' : 'Show Preview'}</Button
							>
						</div>
						<textarea
							id="readme"
							rows="10"
							class="input"
							placeholder="README for the main page of your organization"
							bind:value={$form.readme}
						></textarea>
						{#if preview && $form.readme && $form.readme.length > 0}
							<Markdown text={$form.readme} />
						{/if}
					</label>
					{#if $errors.readme}
						<div class="mt-2">
							<p class="whitespace-normal text-[14px] text-error-400">
								{$errors.readme}
							</p>
						</div>
					{/if}
				</div>
				<div>
					<label for="email" class="label">
						<span>Email</span>
						<Input
							id="email"
							class="input"
							type="text"
							placeholder="Public organization email"
							bind:value={$form.email}
						/>
					</label>
					{#if $errors.email}
						<div class="mt-2">
							<p class="whitespace-normal text-[14px] text-error-400">
								{$errors.email}
							</p>
						</div>
					{/if}
				</div>
				<div>
					<label for="url" class="label">
						<span>Link</span>
						<Input
							id="url"
							class="input"
							type="text"
							placeholder="Link to your organization or related projects"
							bind:value={$form.url}
						/>
					</label>
					{#if $errors.url && Array.isArray($errors.url)}
						<div class="mt-2">
							<ul class="whitespace-normal text-[14px] text-error-400">
								{#each $errors.url as error (error)}
									<li>{error}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
				{#if hasChanges}
					<div class="flex w-full h-fit mx-auto justify-evenly">
						<Button
							class="variant-ghost-surface"
							onclick={resetForm}>Reset</Button>
						{#if !hasErrors && !nameNotAvailable}
							<Button
								type="submit"
								class="variant-filled-primary"
								{submitted}>Create</Button>
						{/if}
					</div>
				{/if}
			</form>
		</div>
	{/snippet}
</Modal>
