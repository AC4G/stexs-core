<script lang="ts">
  import { Button } from 'ui';
  import { signUpSchema } from 'validation-schemas';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { stexs } from '../../stexsClient';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getFlash } from 'sveltekit-flash-message/client';
  import { ProgressRadial } from '@skeletonlabs/skeleton';

  let submitted: boolean = false;
  const flash = getFlash(page);

  const { form, errors, validate } = superForm(
    superValidateSync(signUpSchema),
    {
      validators: signUpSchema,
      validationMethod: 'oninput',
      clearOnSubmit: 'none',
    }
  );

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
        classes: 'variant-ghost-success',
        timeout: 10000,
      };
      return goto('/sign-in');
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

<div class="flex items-center justify-center h-screen">
  <div class="card p-5 variant-ghost-surface space-y-6">
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
      <ul class="whitespace-normal text-[12px] text-error-400 text-center">
        {#each $errors._errors as error (error)}
          <li>{error}</li>
        {/each}
      </ul>
    {/if}
    <form
      class="space-y-6"
      autocomplete="off"
      on:submit|preventDefault={signUp}
    >
      <label for="username" class="label">
        <span>Username</span>
        <input
          id="username"
          class="input"
          type="text"
          required
          bind:value={$form.username}
        />
      </label>
      {#if $errors.username && Array.isArray($errors.username)}
        <ul class="whitespace-normal text-[12px] text-error-400">
          {#each $errors.username as error (error)}
            <li>{error}</li>
          {/each}
        </ul>
      {/if}
      <label for="email" class="label">
        <span>Email</span>
        <input
          id="email"
          class="input"
          type="email"
          required
          bind:value={$form.email}
        />
      </label>
      {#if $errors.email}
        <p class="whitespace-normal text-[12px] text-error-400">
          {$errors.email}
        </p>
      {/if}
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
      {#if $errors.password && Array.isArray($errors.password)}
        <ul class="whitespace-normal text-[12px] text-error-400">
          {#each $errors.password as error (error)}
            <li>{@html error}</li>
          {/each}
        </ul>
      {/if}
      <label for="confirm" class="label">
        <span>Confirm Password</span>
        <input
          id="confirm"
          class="input"
          type="password"
          required
          bind:value={$form.confirm}
        />
      </label>
      {#if $errors.confirm}
        <p class="whitespace-normal text-[12px] text-error-400">
          {$errors.confirm}
        </p>
      {/if}
      <label class="flex items-center space-x-2">
        <input
          id="terms"
          class="checkbox"
          type="checkbox"
          required
          bind:checked={$form.terms}
        />
        <span
          >I agree to <a
            href="/terms-and-conditions"
            class="text-secondary-500 hover:text-secondary-400 transition"
            >Terms and Conditions</a
          ></span
        >
      </label>
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
          <Button type="submit" class="variant-filled-primary">Submit</Button>
        {/if}
      </div>
    </form>
  </div>
</div>
