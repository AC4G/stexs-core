<script lang="ts">
  import { SignIn } from 'validation-schemas';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { Button } from 'ui';
  import { stexs } from '../../stexsClient';
  import { goto } from '$app/navigation';
  import type { Session, SignInInit } from 'stexs-client/src/lib/types';
  import { useQuery } from '@sveltestack/svelte-query';
  import { page } from '$app/stores';
  import { getFlash } from 'sveltekit-flash-message/client';

  let submitted: boolean = false;
  const flash = getFlash(page);

  const signInSetupQuery = useQuery({
    queryKey: ['signInSetup'],
    queryFn: async () => {
      const session: Session = stexs.auth.getSession();

      if (session) return goto('/');

      const signInInit: SignInInit = stexs.auth.getSignInInit();
      if (signInInit !== null && new Date(signInInit.expires * 1000) > new Date())
        return goto('/sign-in-confirm');

      const code = $page.url.searchParams.get('code');
      const message = $page.url.searchParams.get('message');

      if ((code === 'success' || code === 'error') && message) {
        $flash = {
          message,
          classes: `variant-ghost-${code}`,
          timeout: 5000,
        }
      }

      return { data: true };
    }
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
