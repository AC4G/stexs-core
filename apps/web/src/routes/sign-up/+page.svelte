<script lang="ts">
  import { Button } from 'ui';
  import { signUpSchema } from 'validation-schemas';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import SuperDebug from 'sveltekit-superforms/client/SuperDebug.svelte';
  import { stexsClient } from '../../stexsClient';
  import { goto } from '$app/navigation';

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

    console.log({ errors, $errors });

    if (!result.valid) {
      return;
    }

    const response = await (
      await stexsClient.auth.signUp($form.username, $form.email, $form.password)
    ).json();

    if (response.success) {
      goto('/sign-in');
    }

    response.errors.forEach(
      (error: { data: { path: string }; message: string }) => {
        const path = error.data.path;
        // @ts-ignore
        $errors[path] = $errors[path] || [];
        // @ts-ignore
        if (!$errors[path].includes(error.message)) {
          // @ts-ignore
          $errors[path].push(error.message);
        }
      }
    );
  }
</script>

<SuperDebug data={$form} />

<div class="flex items-center justify-center h-screen">
  <div class="card p-4 variant-ghost-surface space-y-4">
    <div class="text-center">
      <h3 class="h3 text-primary-500">Sign Up</h3>
      <div class="mt-3">
        <p>
          Already have an account?
          <a href="/sign-in" class="text-secondary-500">Sign In</a>
        </p>
      </div>
    </div>
    <form
      class="space-y-4"
      autocomplete="off"
      on:submit|preventDefault={signUp}
    >
      <label class="label">
        <span>Username</span>
        <input
          class="input"
          type="text"
          name="username"
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
      <label class="label">
        <span>Email</span>
        <input
          class="input"
          type="email"
          name="email"
          required
          bind:value={$form.email}
        />
      </label>
      {#if $errors.email}
        <p class="whitespace-normal text-[12px] text-error-400">
          {$errors.email}
        </p>
      {/if}
      <label class="label">
        <span>Password</span>
        <input
          class="input"
          type="password"
          name="password"
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
      <label class="label">
        <span>Confirm Password</span>
        <input
          class="input"
          type="password"
          name="confirm"
          required
          bind:value={$form.confirm}
        />
      </label>
      {#if $errors.confirm}
        <p class="whitespace-normal text-[12px] text-error-400">
          {$errors.confirm}
        </p>
      {/if}
      <div class="flex justify-center items-center">
        <Button type="submit" class="variant-filled-primary">Submit</Button>
      </div>
    </form>
  </div>
</div>
