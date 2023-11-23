<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore
  } from '@skeletonlabs/skeleton';
  import { Header, Avatar } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import 'iconify-icon';
  import { user } from '$lib/stores/user';
  import { PUBLIC_S3_ENDPOINT } from '$env/static/public';

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

  const fetchAndSetUser = async () => {
    const { data } = await stexs.from('profiles').select('user_id,username');
    const { user_id: userId, username } = data[0];

    user.set({
      userId,
      username,
    });

    return true;
  }

  onMount(async () => {
    if (stexs.auth.getSession()) {
      signedIn = await fetchAndSetUser();
    }

    stexs.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        signedIn = await fetchAndSetUser();
      }
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
      <Header>
        {#if !signedIn}
          <a href="/sign-in" class="btn">Sign-In</a>
          <a href="/sign-up" class="btn variant-filled-primary">Sign-Up</a>
        {:else}
          <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={$user.userId} username={$user.username}  styles="w-[48px] rounded-full" />
        {/if}
      </Header>
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
