<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore
  } from '@skeletonlabs/skeleton';
  import { Header, Avatar, Truncated } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import 'iconify-icon';
  import { user } from '$lib/stores/user';
  import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
  import { browser } from '$app/environment';
  import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

  initializeStores();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
      },
    },
  });

  const toastStore = getToastStore();
  const flash = getFlash(page);
  const excludeRoutes = [
    '/sign-in',
    '/sign-up',
    '/sign-in-confirm',
    '/recovery',
  ];
  let signedIn: boolean;
  let avatarMenuOpen: boolean = false;
  $: activeUrl = $page.url.pathname;

  flash.subscribe(($flash) => {
    if (!$flash) return;

    toastStore.trigger($flash);
  });

  const fetchAndSetUser = async () => {
    const { id } = await (await stexs.auth.getUser()).json();
    const { data } = await stexs.from('profiles').select('username').eq('user_id', id);
    const { username } = data[0];

    user.set({
      userId: id,
      username,
    });

    return true;
  }

  onMount(async () => {
    if (stexs.auth.getSession()) {
      signedIn = await fetchAndSetUser();
    }
  });

  stexs.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN') {
      signedIn = await fetchAndSetUser();
    }

    if (event === 'SIGNED_OUT') {
      user.set(null);
      signedIn = false;
    }
  });
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

<QueryClientProvider client={queryClient}>
  <Toast />
  {#if !excludeRoutes.includes($page.url.pathname)}
    <AppShell>
      <Header>
        {#if !signedIn}
          <a href="/sign-in" class="btn">Sign-In</a>
          <a href="/sign-up" class="btn variant-filled-primary">Sign-Up</a>
        {:else}
          <div class="relative inline-block mr-[8px]">
            <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={$user?.userId} username={$user?.username} class="avatarMenu w-[48px] cursor-pointer border-4 border-surface-300-600-token hover:!border-primary-500 {avatarMenuOpen && "!border-primary-500"} transition" />
            <Dropdown triggeredBy=".avatarMenu" {activeUrl} activeClass="variant-ghost-secondary" bind:open={avatarMenuOpen} class="absolute right-[-24px] bg-surface-800 p-2 space-y-2 border border-solid border-surface-500">
              <div class="px-4 py-2 rounded variant-ghost-primary">
                <Truncated text={$user?.username || ''} maxLength={8} class="text-[16px]" />
              </div>
              <DropdownDivider />
              <DropdownItem href="/@{$user?.username}" class="hover:!bg-surface-500 transition rounded text-[16px]">Profile</DropdownItem>
              <DropdownItem class="hover:!bg-surface-500 transition rounded text-[16px]">Friends</DropdownItem>
              <DropdownItem class="hover:!bg-surface-500 transition rounded text-[16px]">Settings</DropdownItem>
              <DropdownDivider />
              <DropdownItem class="hover:!bg-surface-500 transition rounded text-[16px]" on:click={async () => { await stexs.auth.signOut() }} >Sign out</DropdownItem>
            </Dropdown>
          </div>
        {/if}
      </Header>
      <slot />
    </AppShell>
  {:else}
    <div class="m-[20px] absolute">
      <a href="/" class="btn-icon variant-filled-surface" title="Home">
        <iconify-icon icon="ph:arrow-left-bold" />
      </a>
    </div>
    <AppShell>
      <QueryClientProvider client={queryClient}>
        <slot />
      </QueryClientProvider>
    </AppShell>
  {/if}
</QueryClientProvider>
