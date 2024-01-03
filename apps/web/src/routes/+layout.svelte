<script lang="ts">
  import '../app.postcss';
  import {
    AppShell,
    Toast,
    setInitialClassState,
    initializeStores,
    getToastStore,
    Modal,
    type ModalComponent,
    popup,
    type PopupSettings
  } from '@skeletonlabs/skeleton';
  import { 
    Header, 
    Avatar, 
    Truncated, 
    Confirm, 
    Button, 
    InventoryItem, 
    OrganizationLogo, 
    ProjectLogo

  } from 'ui';
  import { stexs } from '../stexsClient';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getFlash } from 'sveltekit-flash-message';
  import Icon from '@iconify/svelte';
  import { createUserStore } from '$lib/stores/user';
  import { browser } from '$app/environment';
  import { 
    Dropdown, 
    DropdownItem, 
    DropdownDivider, 
    Search 
  } from 'flowbite-svelte';
  import { QueryClient, QueryClientProvider } from '@sveltestack/svelte-query';
  import { goto } from '$app/navigation';
  import { gql } from 'stexs-client';
  import type { 
    FriendRequestsGQL, 
    FriendRequests, 
    OrganizationRequests, 
    OrganizationRequestsGQL, 
    ProjectRequestsGQL, 
    ProjectRequests 
  } from '$lib/types';
  import { acceptFriendRequest, deleteFriendRequest } from '$lib/utils/friendRequests';
  import { createProfileStore } from '$lib/stores/profile';
  import { createPreviousPageStore } from '$lib/stores/previousPage';
  import { acceptOrganizationJoinRequest, deleteOrganizationJoinRequest } from '$lib/utils/organizationJoinRequests';
  import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
  import { storePopup } from '@skeletonlabs/skeleton';
  import { acceptProjectJoinRequest, deleteProjectJoinRequest } from '$lib/utils/projectJoinRequests';

  
  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
  initializeStores();
  const previousPageStore = createPreviousPageStore();
  const profileStore = createProfileStore();
  const userStore = createUserStore();
  const toastStore = getToastStore();
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
    inventoryItem: { ref: InventoryItem }
  };
  const excludeRoutes = [
    '/sign-in',
    '/sign-up',
    '/sign-in-confirm',
    '/recovery',
  ];
  const avatarPopup: PopupSettings = {
    event: 'hover',
    target: 'avatarPopup',
    placement: 'bottom'
  };

  $: activeUrl = $page.url.pathname;

  let signedIn: boolean;
  let avatarDropDownOpen: boolean = false;
  let notificationsDropDownOpen: boolean = false;
  let selectedNotificationMenu: 'friends' | 'organizations' | 'projects' = 'friends';
  let friendRequests: FriendRequests | [] = [];
  let friendRequestsSearch: string = '';
  let organizationRequests: OrganizationRequests | [] = [];
  let organizationRequestsSearch: string = '';
  let projectRequests: ProjectRequests | [] = [];
  let projectRequestsSearch: string = '';

  flash.subscribe(($flash) => {
    if (!$flash) return;

    toastStore.trigger($flash);
  });

  onMount(async () => {
    const session = stexs.auth.getSession();

    if (!session) return;

    userStore.set({
      id: session.user.id,
      username: session.user.raw_user_meta_data.username
    })
    signedIn = true;
    
    stexs.graphql
      .subscribe({
        query: gql`
        subscription FriendRequestsSubscription {
          friendRequestChanged {
            friendRequests {
              profileByRequesterId {
                username
                userId
              }
            }
          }
        }
      `,
    }).subscribe({
      next({ data }: { data: FriendRequestsGQL }) {
        friendRequests = data?.friendRequestChanged.friendRequests.reverse();
      }
    });

    stexs.graphql
      .subscribe({
        query: gql`
        subscription OrganizationJoinRequestsSubscription {
          organizationJoinRequestChanged {
            organizationRequests {
              role,
              organizationByOrganizationId {
                id
                name
              }
            }
          }
        }
      `,
    }).subscribe({
      next({ data }: { data: OrganizationRequestsGQL }) {
        if (data?.organizationJoinRequestChanged.organizationRequests) {
          organizationRequests = data?.organizationJoinRequestChanged.organizationRequests.reverse();
        }
      }
    });

    stexs.graphql
      .subscribe({
      query: gql`
      subscription ProjectJoinRequestsSubscription {
        projectJoinRequestChanged {
          projectRequests {
            role
            projectByProjectId {
              id
              name
              organizationByOrganizationId {
                name
              }
            }
          }
        }
      }
      `,
    }).subscribe({
      next({ data }: { data: ProjectRequestsGQL }) {
        if (data?.projectJoinRequestChanged.projectRequests) {
          projectRequests = data?.projectJoinRequestChanged.projectRequests.reverse();
        }
      }
    });
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

  $: notifications = {
    friendRequests: {
      count: friendRequests.length,
      data: friendRequests
    },
    organizationRequests:{
      count: organizationRequests.length,
      data: organizationRequests
    },
    projectRequests: {
      count: projectRequests.length,
      data: projectRequests
    },
    exists: friendRequests.length > 0 || 
      organizationRequests.length > 0 || 
      projectRequests.length > 0
  };

  $: searchedFriendRequests = notifications.friendRequests.data.filter(friendRequest => friendRequest.profileByRequesterId.username.toLowerCase().includes(friendRequestsSearch.toLowerCase()));
  $: searchedOrganizationRequests = notifications.organizationRequests.data.filter(organizationRequest => organizationRequest.organizationByOrganizationId.name.toLowerCase().includes(organizationRequestsSearch.toLowerCase()));
  $: searchedProjectRequests = notifications.projectRequests.data
      .map(projectRequest => {
        const searchTerms = projectRequestsSearch.trim().toLowerCase() !== '' ?
          projectRequestsSearch.trim().toLowerCase().split(' ').filter(term => term.length > 0)
          : [""];
        
        const name = projectRequest.projectByProjectId.organizationByOrganizationId.name.toLowerCase() + '/' + projectRequest.projectByProjectId.name.toLowerCase();

        const matchingTermsCount = searchTerms.reduce((count, term) => {
          if (name.includes(term)) {
            return count + 1;
          }
          return count;
        }, 0);

        return {
          projectRequest,
          matchingTermsCount,
        };
      })
      .filter(result => result.matchingTermsCount > 0)
      .sort((a, b) => b.matchingTermsCount - a.matchingTermsCount)
      .map(result => result.projectRequest);
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
          <div class="relative mr-[8px] flex items-center space-x-4 w-full justify-end">
            <Button class="notifications hover:bg-surface-500 rounded-full transition p-3 {notificationsDropDownOpen && 'bg-surface-500'}">
              <div class="relative inline-block">
                {#if notifications.exists}
                  <span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-10 w-[8px] h-[8px]"></span>
                {/if}
                <Icon icon="mdi:bell-outline" width="18" />
              </div>
            </Button>
            <Dropdown triggeredBy=".notifications" bind:open={notificationsDropDownOpen} class="absolute rounded-md right-[-62px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500 w-[280px]">
              <div class="grid grid-cols-3 space-x-1">
                <Button on:click={() => selectedNotificationMenu = 'friends'} class="p-0 hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'friends' && 'bg-surface-500'}">
                  <Icon icon="octicon:person-add-16" />
                  <p class="text-[16px]">{notifications.friendRequests.count}</p>
                </Button>
                <Button on:click={() => selectedNotificationMenu = 'organizations'} class="px-0 py-2 hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'organizations' && 'bg-surface-500'}">
                  <Icon icon="bi:building-add" />
                  <p class="text-[16px]">{notifications.organizationRequests.count}</p>
                </Button>
                <Button on:click={() => selectedNotificationMenu = 'projects'} class="p-0 hover:bg-surface-500 transition items-center flex {selectedNotificationMenu === 'projects' && 'bg-surface-500'}">
                  <Icon icon="octicon:project-symlink-24" />
                  <p class="text-[16px]">{notifications.projectRequests.count}</p>
                </Button>
              </div>
              <DropdownDivider />
              {#if selectedNotificationMenu === 'friends'}
                {#if notifications.friendRequests.count === 0}
                  <p class="text-[16px] text-center p-4">No friend requests received</p>
                {:else}
                  <Search size="md" placeholder="Username" bind:value={friendRequestsSearch} class="!bg-surface-500" />
                  {#if searchedFriendRequests.length > 0}
                    <div class="max-h-[300px] overflow-auto">
                      {#each searchedFriendRequests as friendRequest, index (friendRequest.profileByRequesterId.userId)}
                        <div class="grid grid-cols-3 py-2 pr-2 place-items-center">
                          <a href="/{friendRequest.profileByRequesterId.username}">
                            <Avatar class="w-[48px] border-2 border-surface-300-600-token hover:!border-primary-500 transition {$page.url.pathname === `/${friendRequest.profileByRequesterId.username}` && '!border-primary-500'}" {stexs} userId={friendRequest.profileByRequesterId.userId} username={friendRequest.profileByRequesterId.username} />
                          </a>
                          <div class="grid grid-rows-2 col-span-2 w-full px-1 space-y-1">
                            <Truncated text={friendRequest.profileByRequesterId.username} maxLength={14} class="text-[16px] w-full text-left h-fit" title={friendRequest.profileByRequesterId.username} />
                            <div class="flex justify-between">
                              <Button on:click={() => acceptFriendRequest($userStore.id, friendRequest.profileByRequesterId.userId, friendRequest.profileByRequesterId.username, flash, profileStore) } class="py-[0.8px] px-2 variant-filled-primary text-[16px]">Accept</Button>
                              <Button on:click={() => deleteFriendRequest(friendRequest.profileByRequesterId.userId, $userStore.id, flash, profileStore) } class="py-[0.8px] px-2 variant-ringed-surface hover:bg-surface-600 text-[16px]">Delete</Button>
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-[16px] text-center p-4">Friend requests not found</p>
                  {/if}
                {/if}
              {:else if selectedNotificationMenu === 'organizations'}
                {#if notifications.organizationRequests.count === 0}
                  <p class="text-[16px] text-center p-4">No organization join requests received</p>
                {:else}
                  <Search size="md" placeholder="Organization Name" bind:value={organizationRequestsSearch} class="!bg-surface-500" />
                  {#if searchedOrganizationRequests.length > 0}
                    <div class="max-h-[300px] overflow-auto">
                      {#each searchedOrganizationRequests as organizationRequest}
                        <div class="grid grid-cols-3 py-2 pr-2 place-items-center">
                          <a href="/organizations/{organizationRequest.organizationByOrganizationId.name}" class="pt-1 {$page.url.pathname === `/organizations/${organizationRequest.organizationByOrganizationId.name}` && 'pointer-events-none'}">
                            <OrganizationLogo {stexs} alt={organizationRequest.organizationByOrganizationId.name} organizationId={organizationRequest.organizationByOrganizationId.id} class="w-[55px] rounded-md border border-solid border-surface-500 {$page.url.pathname === `/organizations/${organizationRequest.organizationByOrganizationId.name}` && '!border-primary-500'}" />
                          </a>
                          <div class="grid grid-rows-2 col-span-2 w-full px-1 space-y-1">
                            <div class="flex flex-row space-x-1">
                              <Truncated text={organizationRequest.organizationByOrganizationId.name} maxLength={10} class="text-[16px] w-full text-left h-fit" title={organizationRequest.organizationByOrganizationId.name} />
                              <span class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit">{organizationRequest.role}</span>
                            </div>
                            <div class="flex justify-between">
                              <Button on:click={() => acceptOrganizationJoinRequest($userStore.id, organizationRequest.organizationByOrganizationId.id, organizationRequest.organizationByOrganizationId.name, organizationRequest.role, flash, profileStore) } class="py-[0.8px] px-2 variant-filled-primary text-[16px]">Accept</Button>
                              <Button on:click={() => deleteOrganizationJoinRequest($userStore.id, organizationRequest.organizationByOrganizationId.id, flash) } class="py-[0.8px] px-2 variant-ringed-surface hover:bg-surface-600 text-[16px]">Delete</Button>
                            </div>
                          </div>
                        </div>
                      {/each}                   
                    </div>
                  {:else}
                    <p class="text-[16px] text-center p-4">Organization join requests not found</p>
                  {/if}
                {/if}
              {:else}
                {#if notifications.projectRequests.count === 0}
                  <p class="text-[16px] text-center p-4">No project join requests received</p>
                {:else}
                  <Search size="md" placeholder="Project Name" bind:value={projectRequestsSearch} class="!bg-surface-500" />
                  {#if searchedProjectRequests.length > 0}
                    <div class="max-h-[300px] overflow-auto">
                      {#each searchedProjectRequests as projectRequest}
                        <div class="grid grid-cols-3 py-2 pr-2 place-items-center">
                          <a href="/organizations/{projectRequest.projectByProjectId.organizationByOrganizationId.name}/projects/{projectRequest.projectByProjectId.name}" class="pt-1 {$page.url.pathname === `/organizations/${projectRequest.projectByProjectId.organizationByOrganizationId.name}/projects/${projectRequest.projectByProjectId.name}` && 'pointer-events-none'}">
                            <ProjectLogo {stexs} alt={projectRequest.projectByProjectId.name} projectId={projectRequest.projectByProjectId.id} class="w-[55px] rounded-md border border-solid border-surface-500 {$page.url.pathname === `/organizations/${projectRequest.projectByProjectId.name}` && '!border-primary-500'}" />
                          </a>
                          <div class="grid grid-rows-2 col-span-2 w-full px-1 space-y-1">
                            <div class="flex flex-row space-x-1">
                              <Truncated text={projectRequest.projectByProjectId.organizationByOrganizationId.name + '/' + projectRequest.projectByProjectId.name} maxLength={10} class="text-[16px] w-full text-left h-fit" title={projectRequest.projectByProjectId.organizationByOrganizationId.name + '/' + projectRequest.projectByProjectId.name} />
                              <span class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit">{projectRequest.role}</span>
                            </div>
                            <div class="flex justify-between">
                              <Button on:click={() => acceptProjectJoinRequest($userStore.id, projectRequest.projectByProjectId.id, projectRequest.projectByProjectId.name, projectRequest.projectByProjectId.organizationByOrganizationId.name, projectRequest.role, flash, profileStore)} class="py-[0.8px] px-2 variant-filled-primary text-[16px]">Accept</Button>
                              <Button on:click={() => deleteProjectJoinRequest($userStore.id, projectRequest.projectByProjectId.id ,flash)} class="py-[0.8px] px-2 variant-ringed-surface hover:bg-surface-600 text-[16px]">Delete</Button>
                            </div>
                          </div>
                        </div>
                      {/each}                   
                    </div>
                  {:else}
                    <p class="text-[16px] text-center p-4">Project join requests not found</p>
                  {/if}
                {/if}
              {/if}
            </Dropdown>
            <button use:popup={avatarPopup}>
              <Avatar {stexs} username={$userStore?.username} userId={$userStore.id} class="avatarDropDown w-[48px] cursor-pointer border-2 border-surface-300-600-token hover:!border-primary-500 {avatarDropDownOpen && "!border-primary-500"} transition" />
              <div class="p-2 variant-filled-surface max-w-[80px] w-fit rounded-md right-[-16px]" data-popup="avatarPopup">
                <p class="text-[14px] break-all">{$userStore?.username}</p>
              </div>
            </button>
            <Dropdown triggeredBy=".avatarDropDown" {activeUrl} activeClass="variant-filled-primary pointer-events-none" bind:open={avatarDropDownOpen} class="absolute rounded-md right-[-24px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500">
              <div class="px-4 py-2 rounded variant-ghost-surface max-w-[120px]">
                <p class="text-[14px] break-all">{$userStore?.username}</p>
              </div>
              <DropdownDivider />
              <DropdownItem href="/{$userStore?.username}" class="hover:!bg-surface-500 transition rounded text-[16px]">Profile</DropdownItem>
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
