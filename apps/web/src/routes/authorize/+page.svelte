<script lang="ts">
  import { page } from "$app/stores";
  import { getPreviousPageStore } from "$lib/stores/previousPageStore";
  import { createQuery } from "@tanstack/svelte-query";
  import { getFlash } from "sveltekit-flash-message/client";
  import { stexs } from "../../stexsClient";
  import type { Session } from "stexs-client/src/lib/types";
  import { goto } from "$app/navigation";

  const flash = getFlash(page);
  const previousPageStore = getPreviousPageStore();

  let clientId: string | null = $page.url.searchParams.get('client_id');
  let redirectUrl: string | null = $page.url.searchParams.get('redirect_url');
  let scopes: string[] = $page.url.searchParams.get('scope')?.split(' ') || [];
  let state: string | null = $page.url.searchParams.get('state');

  const authorizeSetupQuery = createQuery({
    queryKey: ['authorizeSetup'],
    queryFn: async () => {
      const session: Session = stexs.auth.getSession();

      if (!session) {
          previousPageStore.set($page.url.pathname + "?" + $page.url.searchParams);
          goto('/sign-in');
          return false;
      }

      let issues = [];

      if (!clientId) {
        issues.push('missing client_id');
      }

      console.log(clientId, redirectUrl, scopes, state);

      if (scopes.length === 0) {
        issues.push('missing scope');
      }

      if (scopes.length === 1 && scopes[0] === '') {
        issues.push('missing scopes in the scope query parameter');
      }

      if (!redirectUrl) {
        issues.push('missing redirect_url');
      }

      if (issues.length > 0) {
        let formattedIssues = '';

        if (issues.length === 1) {
          formattedIssues = issues[0];
        } else {
          const lastIssue = issues.pop();
          formattedIssues = issues.join(', ') + ', and ' + lastIssue;
        }

        $flash = {
          message: `Authorization could not proceed due to the following issues: ${formattedIssues}. Please notify the operator of the application.`,
          classes: 'variant-glass-error',
          autohide: false,
        }

        goto('/');
        return false;
      }

      let client = await stexs.rpc('get_oauth2_app_by_client_id', {
        client_id_param: clientId
      });

      console.log(client);

      // check if client exists by client id
      // if redirectUrl is the one set in client conf,
      // scopes are all set in client conf
      // and if connection already exists for user and the client

      // fetch client data and send boolean check for scopes

      return true;
    }
  });

</script>

{#if !$authorizeSetupQuery.isLoading || $authorizeSetupQuery.data}
  <div class="flex items-center justify-center h-screen flex-col">
    <div class="card p-5 variant-ghost-surface space-y-6 w-full max-w-[400px]">
      <div class="text-center">
        <h3 class="h3 text-primary-500">Authorization</h3>
      </div>
      <div class="">
        <div class="">

        </div>
      </div>
      <!-- render organization and user avatar, requested scopes and redirect link -->

    </div>
  </div>
{/if}
