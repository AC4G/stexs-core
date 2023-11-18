<script lang="ts">
  import { page } from '$app/stores';
  import { validate as uuidValidate, version as uuidVersion } from 'uuid';
  import { stexs } from '../../stexsClient';
  import { superForm, superValidateSync } from 'sveltekit-superforms/client';
  import { isEmailValid } from '$lib/utils/validation';
  import { Recovery, RecoveryConfirm } from 'validation-schemas';
  import { Button } from 'ui';
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import { goto } from '$app/navigation';
  import { getFlash } from 'sveltekit-flash-message/client';

  let confirm: boolean = false;
  let recoverySubmitted: boolean = false;
  let confirmSubmitted: boolean = false;
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

    recoverySubmitted = true;

    const response = await (
      await stexs.auth.recovery($recoveryForm.email)
    ).json();

    if (response.success) {
      $flash = {
        message: response.message,
        classes: 'variant-ghost-success',
        timeout: 10000,
      };
      recoverySubmitted = false;
      return goto('/sign-in');
    }

    response.errors.forEach(
      (error: { data: { path: string }; message: string }) => {
        const path = error.data.path;

        if (!(path in $recoveryErrors)) {
          $recoveryErrors._errors === undefined
            ? ($recoveryErrors._errors = [error.message])
            : $recoveryErrors._errors.push(error.message);
          return;
        }

        // @ts-ignore
        $recoveryErrors[path] = $recoveryErrors[path] || [];
        // @ts-ignore
        if (!$recoveryErrors[path].includes(error.message)) {
          // @ts-ignore
          $recoveryErrors[path].push(error.message);
        }
      }
    );

    recoverySubmitted = false;
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

    confirmSubmitted = true;

    const response = await (
      await stexs.auth.recoveryConfirm(email!, token!, $confirmForm.password)
    ).json();

    if (response.success) {
      $flash = {
        message: response.message,
        classes: 'variant-ghost-success',
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
  }

  function cancel() {
    return goto('/sign-in');
  }
</script>

<div class="flex items-center justify-center h-screen flex-col">
  <div class="card p-5 variant-ghost-surface space-y-6">
    {#if confirm}
      <div class="text-center">
        <h3 class="h3 text-primary-500">Password Recovery</h3>
        <div class="mt-3 max-w-[280px] mx-auto">
          <p>Choose a new password for your account.</p>
        </div>
      </div>
      {#if $confirmErrors._errors && Array.isArray($confirmErrors._errors)}
        <ul class="whitespace-normal text-[12px] text-error-400 text-center">
          {#each $confirmErrors._errors as error (error)}
            <li>{error}</li>
          {/each}
        </ul>
      {/if}
      <form
        class="space-y-6"
        autocomplete="off"
        on:submit|preventDefault={confirmRecovery}
      >
        <label for="password" class="label">
          <span>New Password</span>
          <input
            id="password"
            class="input"
            type="password"
            required
            bind:value={$confirmForm.password}
          />
        </label>
        {#if $confirmErrors.password && Array.isArray($confirmErrors.password)}
          <ul class="whitespace-normal text-[12px] text-error-400">
            {#each $confirmErrors.password as error (error)}
              <li>{error}</li>
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
            bind:value={$confirmForm.confirm}
          />
        </label>
        {#if $confirmErrors.confirm && Array.isArray($confirmErrors.confirm)}
          <ul class="whitespace-normal text-[12px] text-error-400">
            {#each $confirmErrors.confirm as error (error)}
              <li>{error}</li>
            {/each}
          </ul>
        {/if}
        <div class="flex justify-between">
          <Button
            class="variant-ringed-surface hover:bg-surface-600"
            value="Cancel"
            on:click={cancel}>Cancel</Button
          >
          {#if confirmSubmitted}
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
            <Button type="submit" class="variant-filled-primary"
              >Updated Password</Button
            >
          {/if}
        </div>
      </form>
    {:else}
      <div class="text-center">
        <h3 class="h3 text-primary-500">Password Recovery</h3>
        <div class="mt-3 max-w-[280px]">
          <p>
            Enter your email to receive a recovery link. Make sure it's the
            email linked to your account.
          </p>
        </div>
      </div>
      {#if $recoveryErrors._errors && Array.isArray($recoveryErrors._errors)}
        <ul class="whitespace-normal text-[12px] text-error-400 text-center">
          {#each $recoveryErrors._errors as error (error)}
            <li>{error}</li>
          {/each}
        </ul>
      {/if}
      <form
        class="space-y-6"
        autocomplete="off"
        on:submit|preventDefault={requestRecovery}
      >
        <label for="email" class="label">
          <span>Email</span>
          <input
            id="email"
            class="input"
            type="email"
            required
            bind:value={$recoveryForm.email}
          />
        </label>
        <div class="flex justify-between">
          <Button
            class="variant-ringed-surface hover:bg-surface-600"
            value="Cancel"
            on:click={cancel}>Cancel</Button
          >
          {#if recoverySubmitted}
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
            <Button type="submit" class="variant-filled-primary"
              >Request Recovery</Button
            >
          {/if}
        </div>
      </form>
    {/if}
  </div>
</div>
