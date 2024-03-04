<script lang="ts">
  import { page } from '$app/stores';
  import { validate as uuidValidate, version as uuidVersion } from 'uuid';
  import { stexs } from '../../stexsClient';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { isEmailValid } from '$lib/utils/validation';
  import { Recovery, RecoveryConfirm } from 'validation-schemas';
  import { Button, Input } from 'ui';
  import { goto } from '$app/navigation';
  import { getFlash } from 'sveltekit-flash-message/client';

  let confirm: boolean = false;
  let submitted: boolean = false;
  const flash = getFlash(page);

  const email = $page.url.searchParams.get('email');
  const token = $page.url.searchParams.get('token');

  if (
    email &&
    isEmailValid(email) &&
    token &&
    uuidValidate(token) &&
    uuidVersion(token) === 4
  ) {
    confirm = true;
  }

  const {
    form: recoveryForm,
    errors: recoveryErrors,
    validate: validateRecovery,
  } = superForm(superValidateSync(Recovery), {
    validators: Recovery,
    validationMethod: 'oninput',
    clearOnSubmit: 'none',
  });

  async function requestRecovery() {
    const result = await validateRecovery();

    if (!result.valid) return;

    submitted = true;

    const response = await (
      await stexs.auth.recovery($recoveryForm.email)
    ).json();

    if (response.success) {
      $flash = {
        message: response.message,
        classes: 'variant-glass-primary',
        timeout: 10000,
      };
      submitted = false;
      return;
    }

    response.errors.forEach((error: { message: string }) => {
      $recoveryErrors._errors === undefined
        ? ($recoveryErrors._errors = [error.message])
        : $recoveryErrors._errors.push(error.message);
      return;
    });

    submitted = false;
  }

  const {
    form: confirmForm,
    errors: confirmErrors,
    validate: validateConfirm,
  } = superForm(superValidateSync(RecoveryConfirm), {
    validators: RecoveryConfirm,
    validationMethod: 'oninput',
    clearOnSubmit: 'none',
  });

  async function confirmRecovery() {
    const result = await validateConfirm();

    if (!result.valid) return;

    submitted = true;

    const response = await (
      await stexs.auth.recoveryConfirm(email!, token!, $confirmForm.password)
    ).json();

    if (response.success) {
      $flash = {
        message: response.message,
        classes: 'variant-glass-success',
        timeout: 10000,
      };
      return goto('/sign-in');
    }

    response.errors.forEach((error: { message: string }) => {
      $confirmErrors._errors === undefined
        ? ($confirmErrors._errors = [error.message])
        : $confirmErrors._errors.push(error.message);
      return;
    });

    submitted = false;
  }

  function cancel() {
    goto('/sign-in');
  }
</script>

<div class="flex items-center justify-center h-screen flex-col">
  <div class="card p-5 variant-ghost-surface space-y-6">
    <div class="text-center">
      <h3 class="h3 text-primary-500">Password Recovery</h3>
      <div class="mt-3 max-w-[280px] mx-auto">
        {#if confirm}
          <p>Choose a new password for {email}.</p>
        {:else}
          <p>
            Enter your email to receive a recovery link. Make sure it's the
            email linked to your account.
          </p>
        {/if}
      </div>
    </div>
    {#if $confirmErrors._errors && Array.isArray($confirmErrors._errors)}
      <ul class="whitespace-normal text-[14px] text-error-400 text-center">
        {#each $confirmErrors._errors as error (error)}
          <li>{error}</li>
        {/each}
      </ul>
    {/if}
    {#if $recoveryErrors._errors && Array.isArray($recoveryErrors._errors)}
      <ul class="whitespace-normal text-[14px] text-error-400 text-center">
        {#each $recoveryErrors._errors as error (error)}
          <li>{error}</li>
        {/each}
      </ul>
    {/if}
    <form
      class="space-y-6"
      autocomplete="off"
      on:submit|preventDefault={confirm ? confirmRecovery : requestRecovery}
    >
      {#if confirm}
        <Input
          field="password"
          type="password"
          required
          bind:value={$confirmForm.password}>New Password</Input>
        {#if $confirmErrors.password && Array.isArray($confirmErrors.password)}
          <ul class="whitespace-normal text-[14px] text-error-400">
            {#each $confirmErrors.password as error (error)}
              <li>{error}</li>
            {/each}
          </ul>
        {/if}
        <Input
          field="confirm"
          type="password"
          required
          bind:value={$confirmForm.confirm}>Confirm Password</Input>
        {#if $confirmErrors.confirm}
          <p class="whitespace-normal text-[14px] text-error-400">
            {$confirmErrors.confirm}
          </p>
        {/if}
      {:else}
        <Input
          field="email"
          type="email"
          required
          bind:value={$recoveryForm.email}>Email</Input>
      {/if}
      <div class="flex justify-between">
        <Button
          class="variant-ringed-surface hover:bg-surface-600"
          value="Cancel"
          on:click={cancel}>Cancel</Button
        >
        <Button type="submit" class="variant-filled-primary" {submitted}>
          {#if confirm}
            Update Password
          {:else}
            Request Recovery
          {/if}
        </Button>
      </div>
    </form>
  </div>
</div>
