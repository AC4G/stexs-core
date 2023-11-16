<script lang="ts">
  import { Button } from 'ui';
  import { stexsClient } from '../../stexsClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { SignInInit } from 'stexs-client/src/lib/types';

  onMount(() => {
    const signInInit: SignInInit = stexsClient.auth.getSignInInit();

    if (!signInInit) return goto('/');
  });

  async function signInConfirm() {}

  function cancelSignInConfirm() {
    stexsClient.auth.cancelSignInConfirm();
    return goto('/');
  }
</script>

<div class="flex items-center justify-center h-screen">
  <div class="card p-5 variant-ghost-surface space-y-4">
    <div class="text-center">
      <h3 class="h3 text-primary-500">Sign In Confirm</h3>
      <div class="mt-3 max-w-[280px]">
        <p>The confirmation code was been sent to your email</p>
      </div>
    </div>
    <form
      class="space-y-5"
      autocomplete="off"
      on:submit|preventDefault={signInConfirm}
    >
      <label for="code" class="label">
        <span>Code</span>
        <input id="code" class="input" type="text" name="code" required />
      </label>
      <div class="flex justify-between items-center">
        <Button
          class="variant-ringed-surface"
          value="Cancel"
          on:click={cancelSignInConfirm}>Cancel</Button
        >
        <Button type="submit" class="variant-filled-primary">Confirm</Button>
      </div>
    </form>
  </div>
</div>
