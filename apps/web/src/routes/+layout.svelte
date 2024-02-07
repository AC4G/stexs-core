<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore,
    Modal,
    Drawer,
    getDrawerStore,
    type ModalComponent,
    type PopupSettings
  } from '@skeletonlabs/skeleton';
  import { 
    Header, 
    Avatar, 
    Confirm, 
    Button, 
    InventoryItem, 
    AddFriend,
    CreateOrganization,
    initializeCopyButtonListener,
    SettingsSidebar
  } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import Icon from '@iconify/svelte';
  import { createUserStore } from '$lib/stores/userStore';
  import { browser } from '$app/environment';
  import { 
    Dropdown, 
    DropdownItem, 
    DropdownDivider
  } from 'flowbite-svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { goto } from '$app/navigation';
  import { createProfileStore } from '$lib/stores/profileStore';
  import { createPreviousPageStore } from '$lib/stores/previousPageStore';
  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
  import { storePopup, getModalStore, popup } from '@skeletonlabs/skeleton';
  import { openAddFriendModal } from "$lib/utils/modals/friendModals";
  import Notifications from '$lib/Notifications.svelte';

  initializeStores();
  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
  const previousPageStore = createPreviousPageStore();
  const profileStore = createProfileStore();
  const userStore = createUserStore();
  const toastStore = getToastStore();
  const drawerStore = getDrawerStore();
  const modalStore = getModalStore();
  const flash = getFlash(page);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
      },
    },
  });

  const modalRegistry: Record<string, ModalComponent> = {
    confirm: { ref: Confirm },
    inventoryItem: { ref: InventoryItem },
    addFriends: { ref: AddFriend },
    createOrganization: { ref: CreateOrganization }
  };
  const excludeRoutes = [
    '/sign-in',
    '/sign-up',
    '/sign-in-confirm',
    '/recovery',
  ];
  const sidebarRoutes = [
    '/settings'
  ];
  const addFriendPopup: PopupSettings = {
    event: 'hover',
    target: 'addFriendPopup',
    placement: 'bottom'
  };

  const avatarPopup: PopupSettings = {
    event: 'hover',
    target: 'avatarPopup',
    placement: 'bottom'
  };

  let signedIn: boolean;
  let avatarDropDownOpen: boolean = false;

  flash.subscribe(($flash) => {
    if (!$flash) return;

    toastStore.trigger($flash);
  });

  stexs.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN') {
      const session = stexs.auth.getSession();
      userStore.set({
        id: session.user.id,
        username: session.user.raw_user_meta_data.username
      })
      signedIn = true;
    }

    if (event === 'SIGNED_OUT') {
      userStore.set(null);
      signedIn = false;
      goto('/');
    }
  });

  onMount(async () => {
    initializeCopyButtonListener(flash);

    const session = stexs.auth.getSession();

    if (!session) return;

    userStore.set({
      id: session.user.id,
      username: session.user.raw_user_meta_data.username
    })
    signedIn = true;
  });
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

<QueryClientProvider client={queryClient}>
  <Toast buttonDismiss="btn aspect-square px-2 py-1 bg-surface-700 border border-solid border-surface-500" zIndex="z-[1000]" />
  <Modal components={modalRegistry} position="items-center !py-4 !px-0" />
  <Drawer regionDrawer="!w-full sm:!w-64">
    <div class="px-4">
      <div class="flex items-center justify-between h-[70px]">
        <h3 class="h3">Navigation</h3>
        <Button on:click={() => drawerStore.close()} class="p-2 bg-surface-700 hover:text-gray-600 ">
          <Icon icon="ph:x-bold" />
        </Button>
      </div>
	    <hr />
    </div>
    {#if $page.url.pathname.startsWith('/settings')}
      <SettingsSidebar activeUrl={$page.url.pathname} />
    {/if}
  </Drawer>
  {#if !excludeRoutes.includes($page.url.pathname)}
    <AppShell slotSidebarLeft="bg-surface-700 border-surface-500 w-0 {sidebarRoutes.find(route => $page.url.pathname.startsWith(route)) ? 'lg:w-64 lg:border-r' : '!w-0'}">
      <svelte:fragment slot="header">
        <Header {sidebarRoutes} {drawerStore}>
          {#if !signedIn}
            <a href="/sign-in" class="btn py-[1px] px-[1px] bg-gradient-to-br variant-gradient-primary-secondary group">
              <div class="bg-surface-100-800-token text-white rounded-md px-2 py-1 w-full h-full group-hover:bg-gradient-to-br variant-gradient-primary-secondary">Sign In</div>
            </a>
            <a href="/sign-up" class="btn variant-ghost-primary py-[4px] px-3">Sign Up</a>
          {:else}
            <div class="relative mr-[8px] flex items-center space-x-2 w-full justify-end">
              <button use:popup={addFriendPopup} on:click={() => openAddFriendModal($userStore.id, flash, modalStore, stexs)} class="btn relative hover:bg-surface-500 rounded-full transition p-3">
                <Icon icon="octicon:person-add-16" width="18" />
                <div class="p-2 variant-filled-surface rounded-md !ml-0" data-popup="addFriendPopup">
                  <p class="text-[14px] break-all">Add Friend</p>
                </div>
              </button>
              <Notifications />
              <button use:popup={avatarPopup} class="btn relative p-0">
                <Avatar {stexs} username={$userStore?.username} userId={$userStore.id} class="avatarDropDown w-[42px] cursor-pointer border-2 border-surface-300-600-token hover:!border-primary-500 {avatarDropDownOpen && "!border-primary-500"} transition" />
                <div class="p-2 variant-filled-surface max-w-[80px] w-fit rounded-md right-[-16px] !ml-0" data-popup="avatarPopup">
                  <p class="text-[14px] break-all">{$userStore?.username}</p>
                </div>
              </button>
              <Dropdown triggeredBy=".avatarDropDown" activeUrl={'/' + $page.url.pathname.split('/')[1]} activeClass="variant-glass-primary text-primary-500" bind:open={avatarDropDownOpen} class="absolute rounded-md right-[-24px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500">
                <div class="px-4 py-2 rounded variant-ghost-surface">
                  <p class="text-[16px] bg-gradient-to-br from-primary-500 to-secondary-500 bg-clip-text text-transparent box-decoration-clone break-all">{$userStore?.username}</p>
                </div> 
                <DropdownDivider />
                <DropdownItem href="/{$userStore?.username}" class="hover:!bg-surface-500 rounded text-[16px]">Profile</DropdownItem>
                <DropdownItem href="/{$userStore?.username}/friends" class="hover:!bg-surface-500 rounded text-[16px]">Friends</DropdownItem>
                <DropdownItem href="/{$userStore?.username}/organizations" class="hover:!bg-surface-500 rounded text-[16px]">Organizations</DropdownItem>
                <DropdownItem href="/settings" class="hover:!bg-surface-500 rounded text-[16px]">Settings</DropdownItem>
                <DropdownDivider />
                <DropdownItem class="hover:!bg-surface-500 rounded text-[16px]" on:click={() => stexs.auth.signOut()} >Sign Out</DropdownItem>
              </Dropdown>
            </div>
          {/if}
        </Header>
      </svelte:fragment>
      <svelte:fragment slot="sidebarLeft">
        {#if $page.url.pathname.startsWith('/settings')}
          <SettingsSidebar activeUrl={$page.url.pathname} />
        {/if}
      </svelte:fragment>
      <slot />
    </AppShell>
  {:else}
    <div class="m-[20px] absolute">
      <a href="/" class="btn-icon variant-filled-surface" title="Home">
        <Icon icon="ph:arrow-left-bold" />
      </a>
    </div>
    <AppShell>
      <QueryClientProvider client={queryClient}>
        <slot />
      </QueryClientProvider>
    </AppShell>
  {/if}
</QueryClientProvider>
