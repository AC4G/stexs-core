<script lang="ts">
  import { signInSchema } from 'validation-schemas';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { Button } from 'ui';
  import { stexs } from '../../stexsClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { SignInInit } from 'stexs-client/src/lib/types';
  import { redirectToPreviousPage } from '$lib/stores/previousPage';
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  let submitted: boolean = false;

  onMount(() => {
    const signInInit: SignInInit = stexs.auth.getSignInInit();
    if (signInInit !== null && new Date(signInInit.expires * 1000) > new Date())
      return goto('/sign-in-confirm');
  });

  const { form, errors, validate } = superForm(
    superValidateSync(signInSchema),
    {
      validators: signInSchema,
      validationMethod: 'oninput',
      clearOnSubmit: 'none',
    }
  );

  async function signIn() {
    const result = await validate();

    if (!result.valid) return;

    submitted = true;

    const response = await (
      await stexs.auth.signIn($form.identifier, $form.password, $form.remember)
    ).json();

    if (response.token) return goto('/sign-in-confirm');

    if (response.access_token) return redirectToPreviousPage();

    response.errors.forEach((error: { message: string }) => {
      $errors._errors === undefined
        ? ($errors._errors = [error.message])
        : $errors._errors.push(error.message);
      return;
    });

    submitted = false;
  }
</script>

<div class="flex items-center justify-center h-screen flex-col">
  <div class="card p-5 variant-ghost-surface space-y-6">
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
      <ul class="whitespace-normal text-[12px] text-error-400 text-center">
        {#each $errors._errors as error (error)}
          <li>{error}</li>
        {/each}
      </ul>
    {/if}
    <form
      class="space-y-6"
      autocomplete="off"
      on:submit|preventDefault={signIn}
    >
      <label for="identifier" class="label">
        <span>Username or Email</span>
        <input
          id="identifier"
          class="input"
          type="text"
          required
          bind:value={$form.identifier}
        />
      </label>
      <label for="password" class="label">
        <span>Password</span>
        <input
          id="password"
          class="input"
          type="password"
          required
          bind:value={$form.password}
        />
      </label>
      <div class="flex justify-between">
        <label class="flex items-center space-x-2">
          <input
            id="remember"
            class="checkbox"
            type="checkbox"
            value={false}
            bind:checked={$form.remember}
          />
          <span>Remember me</span>
        </label>
        <a
          href="/reset"
          class="text-secondary-500 hover:text-secondary-400 transition"
          >Forgot password?</a
        >
      </div>
      <div class="flex justify-center">
        {#if submitted}
          <Button
            type="submit"
            class="variant-filled-primary opacity-50 cursor-not-allowed"
            disabled
          >
            <ProgressRadial
              stroke={40}
              strokeLinecap="round"
              class="w-[24px]"
            />
          </Button>
        {:else}
          <Button type="submit" class="variant-filled-primary">Sign In</Button>
        {/if}
      </div>
    </form>
  </div>
</div>
