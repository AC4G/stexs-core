<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore,
    Modal,
    type ModalComponent
  } from '@skeletonlabs/skeleton';
  import { Header, Avatar, Truncated, Confirm } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount, setContext } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import Icon from '@iconify/svelte';
  import { user } from '$lib/stores/user';
  import { PUBLIC_S3_ENDPOINT } from '$env/static/public';
  import { browser } from '$app/environment';
  import { Dropdown, DropdownItem, DropdownDivider, Search } from 'flowbite-svelte';
  import { QueryClient, QueryClientProvider } from '@sveltestack/svelte-query';
  import { goto } from '$app/navigation';
  import { gql } from 'stexs-client';
  import type { FriendRequestsGQL, FriendRequests } from '$lib/types';
  import Button from 'ui/src/Button.svelte';
  import { acceptFriendRequest, deleteFriendRequest } from '$lib/utils/friendRequests';

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
  const modalRegistry: Record<string, ModalComponent> = {
    confirm: { ref: Confirm }
  };
  const excludeRoutes = [
    '/sign-in',
    '/sign-up',
    '/sign-in-confirm',
    '/recovery',
  ];
  let signedIn: boolean;
  let avatarDropDownOpen: boolean = false;
  let notificationsDropDownOpen: boolean = false;
  $: activeUrl = $page.url.pathname;
  let friendRequests: FriendRequests | [] = [];
  let selectedNotificationMenu: 'friends' | 'organizations' | 'projects' = 'friends';
  let friendRequestsSearch: string = '';

  flash.subscribe(($flash) => {
    if (!$flash) return;

    toastStore.trigger($flash);
  });

  onMount(async () => {
    const session = stexs.auth.getSession();

    if (!session) return;

    user.set({
      id: session.user.id,
      username: session.user.raw_user_meta_data.username
    })
    signedIn = true;
    
    const observable = stexs.graphql
      .subscribe({
        query: gql`
        subscription FriendRequestsSubscription {
          friendRequestChanged {
            friendRequests {
              profileByRequesterId {
                username
                userId
              }
              id
            }
          }
        }
      `,
    });

    observable.subscribe({
      next({ data }: { data: FriendRequestsGQL }) {
        friendRequests = data?.friendRequestChanged.friendRequests.reverse();
      }
    })
  });

  stexs.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN') {
      const session = stexs.auth.getSession();
      user.set({
        id: session.user.id,
        username: session.user.raw_user_meta_data.username
      })
      signedIn = true;
    }

    if (event === 'SIGNED_OUT') {
      user.set(null);
      signedIn = false;
      goto('/');
    }
  });

  $: setContext('friendRequests', friendRequests);
  $: notifications = {
    friendRequests: {
      count: friendRequests.length,
      data: friendRequests
    },
    organizationRequests:{
      count: 0,
      data: []
    },
    projectRequests: {
      count: 0,
      data: []
    },
    exists: friendRequests.length > 0 
  };
</script>

<svelte:head>
  {@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

<QueryClientProvider client={queryClient}>
  <Toast buttonDismiss="btn-icon btn-icon-sm rounded-full variant-filled pt-[0.5px]" />
  <Modal components={modalRegistry} />
  {#if !excludeRoutes.includes($page.url.pathname)}
    <AppShell>
      <Header>
        {#if !signedIn}
          <a href="/sign-in" class="btn">Sign-In</a>
          <a href="/sign-up" class="btn variant-filled-primary">Sign-Up</a>
        {:else}
          <div class="relative mr-[8px] flex items-center space-x-2 w-full justify-end">
            <Button class="notifications hover:bg-surface-500 rounded-full transition p-3 {notificationsDropDownOpen && 'bg-surface-500'}">
              <div class="relative inline-block">
                {#if notifications.exists}
                  <span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-10 w-[8px] h-[8px]"></span>
                {/if}
                <Icon icon="mdi:bell-outline" width="18" />
              </div>
            </Button>
            <Dropdown triggeredBy=".notifications" bind:open={notificationsDropDownOpen} class="absolute rounded-md right-[-24px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500 w-[240px]">
              <div class="grid grid-cols-3 space-x-1">
                <Button on:click={() => selectedNotificationMenu = 'friends'} class="hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'friends' && 'bg-surface-500'}">
                  <Icon icon="octicon:person-add-16" />
                  <p class="text-[16px]">{notifications.friendRequests.count > 9 ? '+9' : notifications.friendRequests.count}</p>
                </Button>
                <Button on:click={() => selectedNotificationMenu = 'organizations'} class="hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'organizations' && 'bg-surface-500'}">
                  <Icon icon="bi:building-add" />
                  <p class="text-[16px]">{notifications.organizationRequests.count > 9 ? '+9' : notifications.organizationRequests.count}</p>
                </Button>
                <Button on:click={() => selectedNotificationMenu = 'projects'} class="hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'projects' && 'bg-surface-500'}">
                  <Icon icon="octicon:project-symlink-24" />
                  <p class="text-[16px]">{notifications.projectRequests.count > 9 ? '+9' : notifications.projectRequests.count}</p>
                </Button>
              </div>
              <DropdownDivider />
              {#if selectedNotificationMenu === 'friends'}
                <Search size="md" placeholder="Username" bind:value={friendRequestsSearch} class="!bg-surface-500" />
                <div class="max-h-[200px] overflow-auto">
                  {#if notifications.friendRequests.data.length > 0}
                    {#each notifications.friendRequests.data.filter(friendRequest => friendRequest.profileByRequesterId.username.toLowerCase().includes(friendRequestsSearch.toLowerCase())) as friendRequest}
                      <div class="grid grid-cols-3 py-2 pr-2 place-items-center">
                        <a href="/{friendRequest.profileByRequesterId.username}">
                          <Avatar class="w-[44px] border-2 border-surface-300-600-token hover:!border-primary-500 transition {$page.url.pathname === `/${friendRequest.profileByRequesterId.username}` && '!border-primary-500'}" userId={friendRequest.profileByRequesterId.userId} username={friendRequest.profileByRequesterId.username} endpoint={PUBLIC_S3_ENDPOINT} />
                        </a>
                        <div class="grid grid-rows-2 col-span-2 w-full">
                          <Truncated text={friendRequest.profileByRequesterId.username} maxLength={12} class="text-[16px] w-[70%] text-left " />
                          <div class="flex justify-evenly pt-1">
                            <Button on:click={async (event) => {
                              event.stopPropagation();
                              await acceptFriendRequest($user.id, friendRequest.profileByRequesterId.userId, friendRequest.profileByRequesterId.username, flash);
                            }} class="py-[0.8px] px-2 variant-filled-primary text-[14px]">Accept</Button>
                            <Button on:click={async (event) => {
                              event.stopPropagation();
                              await deleteFriendRequest(friendRequest.profileByRequesterId.userId, $user.id, flash);
                            }} class="py-[0.8px] px-2 variant-ringed-surface hover:bg-surface-600 text-[14px]">Delete</Button>
                          </div>
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>
                <DropdownDivider />
                <p class="text-[15px] px-2">Total: {notifications.friendRequests.count}</p>
              {:else if selectedNotificationMenu === 'organizations'}
                <Search size="md" placeholder="Organization Name" class="!bg-surface-500" />
                <div class="max-h-[200px] overflow-auto"></div>
                <DropdownDivider />
                <p class="text-[15px] px-2">Total: {notifications.organizationRequests.count}</p>
              {:else}
                <Search size="md" placeholder="Project Name" class="!bg-surface-500" />
                <div class="max-h-[200px] overflow-auto"></div>
                <DropdownDivider />
                <p class="text-[15px] px-2">Total: {notifications.projectRequests.count}</p>
              {/if}
            </Dropdown>
            <Avatar endpoint={PUBLIC_S3_ENDPOINT} userId={$user?.id} username={$user?.username} class="avatarDropDown w-[48px] cursor-pointer border-4 border-surface-300-600-token hover:!border-primary-500 {avatarDropDownOpen && "!border-primary-500"} transition" />
            <Dropdown triggeredBy=".avatarDropDown" {activeUrl} activeClass="variant-filled-primary pointer-events-none" bind:open={avatarDropDownOpen} class="absolute rounded-md right-[-24px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500">
              <div class="px-4 py-2 rounded variant-ghost-secondary">
                <Truncated text={$user?.username || ''} maxLength={8} class="text-[16px]" />
              </div>
              <DropdownDivider />
              <DropdownItem href="/{$user?.username}" class="hover:!bg-surface-500 transition rounded text-[16px]">Profile</DropdownItem>
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
