<script lang="ts">
	import { getPreviousPageStore } from '$lib/stores/previousPageStore';
  import { stexs } from '../../stexsClient';
  import { goto } from '$app/navigation';
  import type { Session, SignInInit } from 'stexs-client/src/lib/types';
  import { redirectToPreviousPage } from '$lib/stores/previousPageStore';
  import { getFlash } from 'sveltekit-flash-message/client';
  import { page } from '$app/stores';
  import { createQuery } from '@tanstack/svelte-query';
  import { MFA } from 'ui';

  const flash = getFlash(page);
  const previousPageStore = getPreviousPageStore();

  let signInInit: SignInInit;
  let type: string;
  let requested: boolean = false;
  let errors: string[];

  const signInConfirmSetupQuery = createQuery({
    queryKey: ['signInConfirmSetup'],
    queryFn: async () => {
      const session: Session = stexs.auth.getSession();

      if (session) {
        goto('/');

        return false;
      }

      signInInit = stexs.auth.getSignInInit();

      if (
        !signInInit ||
        (signInInit !== null && new Date(signInInit.expires * 1000) < new Date())
      ) {
        goto('/sign-in');

        return false;
      }

      if (signInInit.types.length === 1) {
        type = signInInit.types[0];
      }

      return true;
    }
  });

  function checkSignInInit() {
    signInInit = stexs.auth.getSignInInit();

    if (!signInInit || new Date(signInInit.expires * 1000) < new Date()) {
      requested = false;
      $flash = {
        message: 'Your session has expired. Please sign in again.',
        classes: 'variant-glass-error',
        timeout: 10000,
      };
      goto('/sign-in');
    }
  }

  async function signInConfirm(code: string) {
    checkSignInInit();

    const response = await (
      await stexs.auth.signInConfirm(type, code)
    ).json();

    if (response.access_token) return redirectToPreviousPage(previousPageStore);

    errors = response.errors;
  }

  function cancelSignInConfirm() {
    stexs.auth.cancelSignInConfirm();
    goto('/');
  }
</script>

{#if $signInConfirmSetupQuery.data}
  <div class="flex items-center justify-center h-screen">
    <MFA {stexs} cancel={cancelSignInConfirm} confirm={signInConfirm} {flash} types={signInInit.types} confirmErrors={errors} {type} />
  </div>
{/if}
