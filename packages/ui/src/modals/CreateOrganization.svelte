<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { onMount, SvelteComponent } from 'svelte';
	import Button from '../Button.svelte';
	import Icon from '@iconify/svelte';
	import { superForm, superValidateSync } from 'sveltekit-superforms/client';
	import { CreateOrganization } from 'validation-schemas';
	import Markdown from '../Markdown.svelte';
	import { Input } from 'flowbite-svelte';
	import { debounce } from 'lodash';

	export let parent: SvelteComponent;

	let submitted: boolean = false;
	let preview: boolean = false;
	let hasChanges: boolean = false;
	let hasErrors: boolean = false;
	let nameNotAvailable: boolean = false;
	let checkedNames: { name: string; available: boolean }[] = [];

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

	const modalStore = getModalStore();
	const stexs = $modalStore[0].meta.stexsClient;
	const flash = $modalStore[0].meta.flash;
	const organizationsMemberStore = $modalStore[0].meta.organizationsMemberStore;
	const { form, errors, validate } = superForm(
		superValidateSync(CreateOrganization),
		{
			validators: CreateOrganization,
			validationMethod: 'oninput',
			clearOnSubmit: 'none',
		},
	);
	const formKeys = Object.keys($form);

	onMount(() => {
		let nameInput = document.getElementById('name');

		if (nameInput) nameInput.focus();
	});

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
		const result = await validate();

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
			flash.set({
				message: `${$form.name} organization was been successfully created.`,
				classes: 'variant-glass-success',
				timeout: 5000,
			});
			organizationsMemberStore.refetch();
			modalStore.close();
		}

		submitted = false;
	}

	$: if ($form.email?.length === 0 && $errors.email?.length > 0) {
		$errors.email = [];
	}

	$: {
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
	}

	// $errors in if st. only for reactivity
	$: if ($errors && hasChanges) {
		(async () => (hasErrors = !(await validate()).valid))();
	}
</script>

{#if $modalStore[0]}
	<div
		class="card p-3 sm:p-5 space-y-6 flex flex-col max-w-[600px] w-full relative"
	>
		<div>
			<div class="absolute right-[8px] top-[8px]">
				<Button on:click={parent.onClose} class="p-3 variant-ghost-surface">
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
		<form class="space-y-6" on:submit|preventDefault={createOrganization}>
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
						bind:value={$form.name}
						on:input={checkNameAvailability}
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
					/>
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
					<span>README</span>
					<textarea
						id="readme"
						rows="10"
						class="input"
						placeholder="README for the main page of your organization"
						bind:value={$form.readme}
					/>
					<Button
						type="button"
						class="btn px-1 chip variant-ghost-surface"
						on:click={() => (preview = !preview)}
						>{preview ? 'Hide Preview' : 'Show Preview'}</Button
					>
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
					<Button class="variant-ghost-surface" on:click={resetForm}>Reset</Button>
					{#if !hasErrors && !nameNotAvailable}
						<Button type="submit" class="variant-filled-primary" {submitted}
							>Create</Button
						>
					{/if}
				</div>
			{/if}
		</form>
	</div>
{/if}
