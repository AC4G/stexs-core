<script lang="ts">
  import { Button, Input } from 'ui';
  import { SignUp } from 'validation-schemas';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { stexs } from '../../stexsClient';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getFlash } from 'sveltekit-flash-message/client';
  import { createQuery } from '@tanstack/svelte-query';
  import type { Session } from 'stexs-client/src/lib/types';

  let submitted: boolean = false;
  const flash = getFlash(page);

  const signUpSetupQuery = createQuery({
    queryKey: ['signUpSetup'],
    queryFn: async () => {
      const session: Session = stexs.auth.getSession();

      if (session) {
        goto('/');

        return false;
      }

      return true;
    }
  });

  const { form, errors, validate } = superForm(superValidateSync(SignUp), {
    validators: SignUp,
    validationMethod: 'oninput',
    clearOnSubmit: 'none',
  });

  async function signUp() {
    const result = await validate();
 
    if (!result.valid) return;

    submitted = true;

    const response = await (
      await stexs.auth.signUp($form.username, $form.email, $form.password)
    ).json();

    if (response.success) {
      $flash = {
        message: response.message,
        classes: 'variant-glass-success',
        timeout: 10000,
      };
      goto('/sign-in');

      return;
    }

    response.errors.forEach(
      (error: { data: { path: string }; message: string }) => {
        const path = error.data.path;

        if (!(path in $errors)) {
          $errors._errors === undefined
            ? ($errors._errors = [error.message])
            : $errors._errors.push(error.message);
          return;
        }

        // @ts-ignore
        $errors[path] = $errors[path] || [];
        // @ts-ignore
        if (!$errors[path].includes(error.message)) {
          // @ts-ignore
          $errors[path].push(error.message);
        }
      }
    );

    submitted = false;
  }
</script>

{#if $signUpSetupQuery.data}
  <div class="flex items-center justify-center h-screen">
    <div class="card p-5 variant-ghost-surface space-y-6  w-full max-w-[400px]">
      <div class="text-center">
        <h3 class="h3 text-primary-500">Sign Up</h3>
        <div class="mt-3">
          <p>
            Already have an account?
            <a
              href="/sign-in"
              class="text-secondary-500 hover:text-secondary-400 transition"
              >Sign In</a
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
      <form
        class="space-y-6"
        on:submit|preventDefault={signUp}
      >
        <div>
          <Input
            field="username"
            required
            bind:value={$form.username}>Username</Input>
          {#if $errors.username && Array.isArray($errors.username)}
            <ul class="whitespace-normal text-[14px] mt-2 text-error-400">
              {#each $errors.username as error (error)}
                <li>{error}</li>
              {/each}
            </ul>
          {/if}
        </div>
        <div>
          <Input
            field="email"
            type="email"
            required
            bind:value={$form.email}>Email</Input>
          {#if $errors.email}
            <p class="whitespace-normal text-[14px] mt-2 text-error-400">
              {$errors.email}
            </p>
          {/if}
        </div>
        <div>
          <Input
            field="password"
            type="password"
            required
            bind:value={$form.password}>Password</Input>
          {#if $errors.password && Array.isArray($errors.password)}
            <ul class="whitespace-normal text-[14px] mt-2 text-error-400">
              {#each $errors.password as error (error)}
                <li>{error}</li>
              {/each}
            </ul>
          {/if}
        </div>
        <div>
          <Input
            field="confirm"
            type="password"
            required
            bind:value={$form.confirm}>Confirm Password</Input>
          {#if $errors.confirm}
            <p class="whitespace-normal text-[14px] text-error-400">
              {$errors.confirm}
            </p>
          {/if}
        </div>
        <Input
          field="terms"
          labelClass="flex items-center space-x-2"
          labelAfter={true}
          inputClass="checkbox"
          type="checkbox"
          required
          bind:checked={$form.terms}>
          I agree to <a href="/terms-and-conditions" class="text-secondary-500 hover:text-secondary-400 transition">Terms and Conditions</a>
        </Input>
        <div class="flex justify-center">
          <Button type="submit" class="variant-filled-primary" {submitted}
            >Submit</Button
          >
        </div>
      </form>
    </div>
  </div>
{/if}
