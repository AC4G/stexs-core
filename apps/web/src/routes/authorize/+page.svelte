<script lang="ts">
  import { page } from "$app/stores";
  import { getPreviousPageStore } from "$lib/stores/previousPageStore";
  import { createQuery } from "@tanstack/svelte-query";
  import { getFlash } from "sveltekit-flash-message/client";
  import { stexs } from "../../stexsClient";
  import type { Session } from "stexs-client/src/lib/types";
  import { goto } from "$app/navigation";
  import { getUserStore } from '$lib/stores/userStore';

  const flash = getFlash(page);
  const previousPageStore = getPreviousPageStore();
  const userStore = getUserStore();

  let clientId: string | null = $page.url.searchParams.get('client_id');
  let redirectUrl: string | null = $page.url.searchParams.get('redirect_url');
  let scopes: string[] = $page.url.searchParams.get('scope')?.split(' ') || [];
  let state: string | null = $page.url.searchParams.get('state');

  const pleaseNotify = "Please notify the application operator.";
  const couldNotProceed = "Authorization could not proceed due to the following issues:";

  let clientData: {
    id: number;
    name: string;
    client_id: string;
    organization_id: number;
    project_id: number | null;
    description: string | null;
    homepage_url: string | null;
    created_at: string;
    updated_at: string | null;
  };

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
          message: `${couldNotProceed} ${formattedIssues}. ${pleaseNotify}`,
          classes: 'variant-glass-error',
          autohide: false,
        }

        goto('/');
        return false;
      }

      const responseClientData = await stexs.rpc('get_oauth2_app_by_client_id', {
        client_id_param: clientId
      });

      if (responseClientData.error) {
        $flash = {
          message: `${couldNotProceed} ${responseClientData.error.message}. ${pleaseNotify}`,
          classes: 'variant-glass-error',
          autohide: false,
        }
        goto('/');
        return false;
      }

      if (responseClientData.data === 0) {
        $flash = {
          message: `Provided client_id does not exist. ${pleaseNotify}`,
          classes: 'variant-glass-error',
          autohide: false,
        }
        goto('/');
        return false;
      }

      clientData = responseClientData.data[0];

      const responseConnectionExists = await stexs.from('oauth2_connections')
        .select('', { 
            count: 'exact', 
            head: true 
        })
        .eq('user_id', $userStore?.id)
        .eq('client_id', clientId);

      if (responseConnectionExists.count > 0) {
        $flash = {
          message: `You already have an active connection with the application.`,
          classes: 'variant-glass-success',
          timeout: 5000,
        }
        goto('/');
        return false;
      }

      const responseScopesValid = await stexs.from('oauth2_app_scopes')
        .select('scopes(name)')
        .eq('app_id', clientData.id)
        .in('scopes.name', scopes)
        .not('scopes', 'is', null);

      const scopeData = responseScopesValid.data
        .map((scope: { scopes: { name: string } }) => scope.scopes.name);
      const invalidScopes = scopes.filter((scope) => !scopeData.includes(scope));

      if (invalidScopes.length > 0) {
        $flash = {
          message: `Provided scopes are invalid or not assigned to the application: ${invalidScopes.join(', ')}. ${pleaseNotify}`,
          classes: 'variant-glass-error',
          autohide: false,
        }
        goto('/');
        return false;
      }

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
