<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { SignIn } from 'validation-schemas';
	import { superForm, superValidateSync } from 'sveltekit-superforms/client';
	import { Button, Input } from 'ui';
	import { stexs } from '../../stexsClient';
	import { goto } from '$app/navigation';
	import type { Session, SignInInit } from 'stexs-client/src/lib/types';
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import { getFlash } from 'sveltekit-flash-message/client';

	let submitted: boolean = $state(false);
	const flash = getFlash(page);

	let code = $page.url.searchParams.get('code');
	let message = $page.url.searchParams.get('message');

	const signInSetupQuery = createQuery({
		queryKey: ['signInSetup'],
		queryFn: async () => {
			if ((code === 'success' || code === 'error') && message) {
				$flash = {
					message,
					classes: `variant-glass-${code}`,
					timeout: 5000,
				};
			}

			const session: Session = stexs.auth.getSession();

			if (session) {
				goto('/');

				return false;
			}

			const signInInit: SignInInit = stexs.auth.getSignInInit();
			if (
				signInInit !== null &&
				new Date(signInInit.expires * 1000) > new Date()
			) {
				goto('/sign-in-confirm');

				return false;
			}

			return true;
		},
	});

	const { form, errors, validate } = superForm(superValidateSync(SignIn), {
		validators: SignIn,
		validationMethod: 'oninput',
		clearOnSubmit: 'none',
	});

	async function signIn() {
		const result = await validate();

		if (!result.valid) return;

		submitted = true;

		const response = await (
			await stexs.auth.signIn($form.identifier, $form.password, $form.remember)
		).json();

		if (response.token) return goto('/sign-in-confirm');

		response.errors.forEach((error: { message: string }) => {
			$errors._errors === undefined
				? ($errors._errors = [error.message])
				: $errors._errors.push(error.message);
			return;
		});

		submitted = false;
	}
</script>

{#if !$signInSetupQuery.isLoading && $signInSetupQuery.data}
	<div class="flex items-center justify-center h-full flex-col">
		<div class="card p-5 variant-ghost-surface space-y-6 w-full max-w-[400px]">
			<div class="text-center">
				<h3 class="h3 text-primary-500">Sign In</h3>
				<div class="mt-3">
					<p>
						Don't have an account?
						<a
							href="/sign-up"
							class="text-secondary-500 hover:text-secondary-400 transition"
							>Sign Up</a
						>
					</p>
				</div>
			</div>
			{#if $errors._errors && Array.isArray($errors._errors)}
				<ul class="whitespace-normal text-[14px] text-error-400 text-center">
					{#each $errors._errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}
			<form class="space-y-6" onsubmit={preventDefault(signIn)}>
				<Input
					field="identifier"
					type="text"
					required
					bind:value={$form.identifier}>Username or Email</Input
				>
				<Input
					field="password"
					type="password"
					required
					bind:value={$form.password}>Password</Input
				>
				<div class="flex justify-between">
					<Input
						field="remember"
						inputClass="checkbox"
						labelClass="flex items-center space-x-2"
						type="checkbox"
						labelAfter={true}
						bind:checked={$form.remember}>Remember me</Input
					>
					<a
						href="/recovery"
						class="text-secondary-500 hover:text-secondary-400 transition"
						>Forgot password?</a
					>
				</div>
				<div class="flex justify-center">
					<Button type="submit" class="variant-filled-primary" {submitted}
						>Sign In</Button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
