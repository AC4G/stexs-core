<script lang="ts">
    import { gql } from 'stexs-client';
    import { stexs } from '../stexsClient';
    import { onDestroy, onMount } from 'svelte';
    import { popup, type PopupSettings, ProgressRadial } from '@skeletonlabs/skeleton';
    import { createQuery } from "@tanstack/svelte-query";
    import type { NotificationsGQL } from './types';
    import Icon from '@iconify/svelte';
    import { 
        Dropdown, 
        DropdownItem, 
        DropdownDivider, 
        Search 
    } from 'flowbite-svelte';
    import { getUserStore } from './stores/userStore';

    const userStore = getUserStore();

    let notificationsWindow: any;
    const notificationsPopup: PopupSettings = {
        event: 'hover',
        target: 'notificationsPopup',
        placement: 'bottom'
    };

    let dropDownOpen: boolean = false;
    const query = gql`
        query Notifications($first: Int, $after: Cursor, $userId: UUID) {
            allNotifications(first: $first, after: $after, orderBy: ID_DESC, condition: { userId: $userId }) {
                edges {
                    node {
                        id
                        message
                        type
                        seen
                        friendRequestByFriendRequestId {
                            profileByRequesterId {
                                userId
                                username
                            }
                        }
                        organizationRequestByOrganizationRequestId {
                            organizationByOrganizationId {
                                id
                                name
                            }
                            role
                        }
                        projectRequestByProjectRequestId {
                            projectByProjectId {
                                id
                                name
                            }
                            role
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                }
            }
        }
    `;
    let subscription: { unsubscribe: () => void };
    let notifications: any[] = [];
    let after: string | null = null;
    let pageInfo: {
        hasNextPage: boolean,
        hasPreviousPage: boolean
    } = {
        hasNextPage: false,
        hasPreviousPage: false
    };
    let unseenNotifications: number = 0;

    async function markAllNotificationsAsSeen() {
        if ($userStore?.id) {
            const result = await stexs
                .from('notifications')
                .update({
                    seen: true
                })
                .eq('user_id', $userStore.id);

            console.log({ result })
        }
    }

    async function fetchNotifications(after: string | null) {
        const allNotifications = (await stexs.graphql.query({
            query: query,
            variables: {
                first: 20,
                after,
                userId: $userStore?.id
            }
        })).data.allNotifications;

        pageInfo = allNotifications.pageInfo;

        return allNotifications.edges;
    }

    $: notificationsQuery = createQuery({
        queryKey: ['notifications', after],
        queryFn: async () => await fetchNotifications(after),
        enabled: !!$userStore?.id && dropDownOpen === true
    });

    $: {
        if (dropDownOpen && unseenNotifications > 0)
            markAllNotificationsAsSeen();
    }

    $: {
        if ($notificationsQuery.data)
            notifications = [
                ...$notificationsQuery.data
            ];
    };

    $: {
        if (dropDownOpen === false)
            notifications = [];

    };

    onMount(async () => {
        subscription = stexs.graphql
        .subscribe({
            query: gql`
            subscription NotificationsSubscription {
                notificationsChanged {
                    unseenNotifications
                }
            }
        `
        }).subscribe({
            next({ data }: { data: NotificationsGQL }) {
                unseenNotifications = data?.notificationsChanged.unseenNotifications;
            }
        });
    });

    onDestroy(() => {
        subscription?.unsubscribe();
    });

    async function handleScroll() {
        if (
            notificationsWindow &&
            notificationsWindow.scrollHeight - notificationsWindow.scrollTop <=
            notificationsWindow.clientHeight + 1
        ) {
            if (pageInfo.hasNextPage) {
                notifications = [
                    ...notifications,
                    ...await fetchNotifications(notifications.slice(-1)[0].cursor)
                ];
            }
        }
    }
</script>

<button use:popup={notificationsPopup} class="btn relative notifications hover:bg-surface-500 rounded-full transition p-3 {dropDownOpen && 'bg-surface-500'}">
    <div>
        <div class="relative">
            {#if unseenNotifications > 0}
              <span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-10 w-[8px] h-[8px]"></span>
            {/if}
        </div>
        <Icon icon="mdi:bell-outline" width="18" />
        <div class="p-2 variant-filled-surface rounded-md" data-popup="notificationsPopup">
            <p class="text-[14px] break-all">Notifications</p>
        </div>
    </div>
</button>
<Dropdown id="dropdown" triggeredBy=".notifications" bind:open={dropDownOpen} class="absolute rounded-md right-[-86px] sm:right-[-74px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500 max-w-[100vw] sm:max-w-[480px]">
    {#if $notificationsQuery.isLoading}
        <div class="w-[144px] flex items-center justify-center py-2">
            <ProgressRadial stroke={40} value={undefined} width="w-[30px]" />
        </div>
    {:else}
        {#if notifications.length > 0}
            <div bind:this={notificationsWindow} on:scroll={handleScroll} class="max-h-[400px] overflow-x-auto break-words">
                {#each notifications as notification (notification.node.id)}
                    {JSON.stringify(notification)}
                {/each}
            </div>
        {:else}
            <div class="p-5 w-full whitespace-normal sm:whitespace-pre">
                You haven't received any notifications
            </div>
        {/if}
    {/if}
</Dropdown>


