<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore,
  } from '@skeletonlabs/skeleton';
  import { Header } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import 'iconify-icon';

  initializeStores();

  const toastStore = getToastStore();
  const flash = getFlash(page);
  const excludeRoutes = [
    '/sign-in',
    '/sign-up',
    '/sign-in-confirm',
    '/recovery',
  ];
  let signedIn: boolean;

  flash.subscribe(($flash) => {
    if (!$flash) return;

    toastStore.trigger($flash);
  });

  onMount(() => {
    if (stexs.auth.getSession()) signedIn = true;

    stexs.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') signedIn = true;
    });
  });
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

<Toast />
{#if !excludeRoutes.includes($page.url.pathname)}
  <AppShell>
    <svelte:fragment slot="header">
      <Header {signedIn} />
    </svelte:fragment>
    <slot />
  </AppShell>
{:else}
  <div class="m-[20px] absolute">
    <a href="/" class="btn-icon variant-filled-surface" title="Home">
      <iconify-icon icon="ph:arrow-left-bold" />
    </a>
  </div>
  <AppShell>
    <slot />
  </AppShell>
{/if}
