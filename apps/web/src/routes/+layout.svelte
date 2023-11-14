<script lang="ts">
  import '../app.postcss';
  import { AppShell, setInitialClassState } from '@skeletonlabs/skeleton';
  import { Header } from 'ui';
  import { stexsClient } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  const excludeRoutes = ['/sign-in', '/sign-up'];
  let signedIn: boolean;

  onMount(() => {
    if (stexsClient.auth.getSession()) signedIn = true;

    stexsClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') signedIn = true;
    });
  });
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

{#if !excludeRoutes.includes($page.url.pathname)}
  <AppShell>
    <svelte:fragment slot="header">
      <Header {signedIn} />
    </svelte:fragment>
    <slot />
  </AppShell>
{:else}
  <AppShell>
    <slot />
  </AppShell>
{/if}
