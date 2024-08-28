<script lang="ts">
    import { stexs } from '../stexsClient';
    import { popup, type PopupSettings, ProgressRadial, ListBoxItem } from '@skeletonlabs/skeleton';
    import { createQuery } from "@tanstack/svelte-query";
    import Icon from '@iconify/svelte';
    import { Dropdown, Search } from 'flowbite-svelte';
    import { getUserStore } from './stores/userStore';
    import { Avatar, Button, Markdown, OrganizationLogo, ProjectLogo } from 'ui';
    import { page } from '$app/stores';
    import { debounce } from 'lodash';
    import { acceptFriendRequest, deleteFriendRequest } from './utils/friend';
    import { getFlash } from 'sveltekit-flash-message/client';
    import { getProfileStore } from './stores/profileStore';
    import { formatDistanceStrict } from './utils/formatDistance';
    import { acceptOrganizationRequest, deleteOrganizationRequest } from './utils/organizationRequests';
    import { acceptProjectRequest, deleteProjectRequest } from './utils/projectRequests';

    const userStore = getUserStore();
    const flash = getFlash(page);
    const profileStore = getProfileStore();

    let initialDataExists: boolean = false;
    let search: string = '';
    let previousSearch: string = '';
    let filter: string = 'All';
    let previousFilter: string = 'All';
    let notificationsWindow: any;
    const notificationsPopup: PopupSettings = {
        event: 'hover',
        target: 'notificationsPopup',
        placement: 'bottom'
    };
    const notificationsWindowPopup: PopupSettings = {
        event: 'click',
        target: 'notificationsWindowPopup',
        placement: 'bottom',
        closeQuery: 'a[href]',
        state: (event) => dropDownOpen = event.state
    };

    let dropDownOpen: boolean = false;
    let notifications: any[] = [];

    const handleSearch = debounce((e: Event) => {
        search = (e.target as HTMLInputElement)?.value || '';
    }, 200);

    async function deleteMessage(id: number): Promise<boolean> {
        const { error } = await stexs
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            flash.set({
                message: 'Could not delete notification. Try out again.',
                classes: 'variant-glass-error',
                timeout: 5000,
            });
        }

        return error === null;
    }

    async function markAllNotificationsAsSeen() {
        if ($userStore?.id) {
            await stexs
                .from('notifications')
                .update({
                    seen: true
                })
                .eq('user_id', $userStore.id);

            $unseenNotificationsQuery.refetch();
        }
    }

    async function fetchUnseenNotifications(userId: string) {
        const { count } = await stexs
            .from('notifications')
            .select('', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('seen', false);

        return count;
    }

    async function fetchNotifications(userId: string, filter: string, search: string, lastId: number | null) {
        if (search !== previousSearch) {
            notifications = [];
            previousSearch = search;
        }
        
        if (filter !== previousFilter) {
            notifications = [];
            previousFilter = filter;
        }

        const query = stexs
            .from('notifications')
            .select(`
                id,
                message,
                type,
                seen,
                friend_requests(
                    profiles!friend_requests_requester_id_fkey(
                        user_id,
                        username
                    )
                ),
                organization_requests(
                    organizations(
                        id,
                        name
                    ),
                    role
                ),
                project_requests(
                    projects(
                        id,
                        name,
                        organizations(
                            name
                        )
                    ),
                    role
                ),
                created_at,
                updated_at
            `)
            .order('id', { ascending: false })
            .eq('user_id', userId)
            .limit(10)

        if (lastId) query.lt('id', [lastId]);

        if (filter === 'Messages') query.eq('type', 'message');

        if (filter === 'Friend Requests') {
            query
                .ilike('friend_requests.profiles.username', `%${search}%`)
                .not('friend_requests.profiles', 'is', null)
                .not('friend_requests', 'is', null)
                .eq('type', 'friend_request');
        }

        if (filter === 'Organization Requests') {
            query
                .ilike('organization_requests.organizations.name', `%${search}%`)
                .not('organization_requests.organizations', 'is', null)
                .not('organization_requests', 'is', null)
                .eq('type', 'organization_request');
        }

        if (filter === 'Project Requests') {
            query
                .ilike('project_requests.projects.name', `%${search}%`)
                .ilike('project_requests.projects.organizations.name', `%${search}%`)
                .not('project_requests.projects', 'is', null)
                .not('project_requests', 'is', null)
                .eq('type', 'project_request');
        }


        const { data } = await query;

        return data;
    }

    $: unseenNotificationsQuery = createQuery({
        queryKey: ['unseenNotifications'],
        queryFn: async () => await fetchUnseenNotifications($userStore!.id),
        enabled: !!$userStore?.id && dropDownOpen === false,
        refetchInterval: 5000
    });

    $: notificationsQuery = createQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const data = await fetchNotifications($userStore!.id, filter, search, null);

            if (data) initialDataExists = true;

            return data;
        },
        enabled: !!$userStore?.id && dropDownOpen === true
    });

    $: {
        if (dropDownOpen && $unseenNotificationsQuery.data > 0) {
            setTimeout(markAllNotificationsAsSeen, 100);
        }
    }

    $: {
        if ($notificationsQuery.data) {
            notifications = [
                ...$notificationsQuery.data
            ];
        }
    };

    $: {
        if (dropDownOpen === false) {
            notifications = [];
            search = '';
            previousSearch = '';
            filter = 'All';
            previousFilter = 'All';
        }
    };

    async function handleScroll() {
        if (
            notificationsWindow &&
            notificationsWindow.scrollHeight - notificationsWindow.scrollTop <=
            notificationsWindow.clientHeight + 1
        ) {
            notifications = [
                ...notifications,
                ...await fetchNotifications($userStore!.id, filter, search, notifications.slice(-1)[0].id)
            ];
        }
    }

    function removeNotificationByIndex(index: number) {
        notifications = notifications.filter((_, i) => i !== index)
    }
</script>

<button use:popup={notificationsWindowPopup} use:popup={notificationsPopup} class="btn relative notifications hover:bg-surface-500 rounded-full transition p-3 {dropDownOpen && 'bg-surface-500'}">
    <div>
        <div class="relative">
            {#if $unseenNotificationsQuery.data > 0}
              <span class="badge-icon variant-filled-primary absolute -top-1 -right-2 z-10 w-[8px] h-[8px]"></span>
            {/if}
        </div>
        <Icon icon="mdi:bell-outline" width="18" />
        <div class="p-2 variant-filled-surface rounded-md" data-popup="notificationsPopup">
            <p class="text-[14px] break-all">Notifications</p>
        </div>
    </div>
</button>
<div data-popup="notificationsWindowPopup">
    <div class="absolute rounded-md right-[-86px] sm:right-[-74px] bg-surface-900 p-2 space-y-2 border border-surface-500 w-[100vw] sm:w-[400px]">
        {#if ($notificationsQuery.isSuccess) || search.length > 0 || filter !== 'All'}
            {#if filter !== 'All' && filter !== 'Messages'}
                <Search size="lg" placeholder={filter.split(' ')[0] + ' Name'} on:input={handleSearch} class="!bg-surface-500" />
            {/if}
            <Button class="bg-surface-500 border border-gray-600 w-full py-[8px]">
                {filter}<Icon icon="iconamoon:arrow-down-2-duotone" class="text-[22px]" />
            </Button>
            <Dropdown class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500">
                <ListBoxItem bind:group={filter} name="filter" value={'All'} active="variant-glass-primary text-primary-500" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">All</ListBoxItem>
                <ListBoxItem bind:group={filter} name="filter" value={'Messages'} active="variant-glass-primary text-primary-500" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">Messages</ListBoxItem>
                <ListBoxItem bind:group={filter} name="filter" value={'Friend Requests'} active="variant-glass-primary text-primary-500" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">Friend Requests</ListBoxItem>
                <ListBoxItem bind:group={filter} name="filter" value={'Organization Requests'} active="variant-glass-primary text-primary-500" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">Organization Requests</ListBoxItem>
                <ListBoxItem bind:group={filter} name="filter" value={'Project Requests'} active="variant-glass-primary text-primary-500" hover="hover:variant-filled-surface" class="rounded-md px-4 py-2">Project Requests</ListBoxItem>
            </Dropdown>
        {/if}
        {#if $notificationsQuery.isLoading}
            <div class="flex items-center justify-center py-2">
                <ProgressRadial stroke={40} value={undefined} width="w-[30px]" />
            </div>
        {:else}
            {#if notifications.length > 0}
                <div bind:this={notificationsWindow} on:scroll={handleScroll} class="max-h-[400px] overflow-y-auto space-y-2">
                    {#each notifications as notification, index (notification.id)}
                        <div class="rounded p-2 {notification.seen ? 'bg-surface-700 border border-surface-600' : 'variant-ghost-primary'}">
                            {#if notification.type === 'message'}
                                <div class="flex flex-row space-x-2">
                                    <Markdown class="" text={notification.message} />
                                    <div class="space-y-2">
                                        <Button on:click={async () => {
                                            const result = await deleteMessage(notification.id);
    
                                            if (result) removeNotificationByIndex(index);
                                        }} class="p-1 h-fit variant-ghost-surface">
                                            <Icon icon="ph:x-bold" />
                                        </Button>
                                        <p class="text-[14px] w-[26px] text-surface-300 text-right pr-1">{formatDistanceStrict(new Date(notification.created_at), new Date())}</p>
                                    </div>
                                </div>
                            {:else if notification.type === 'friend_request'}
                                {@const profile = notification.friend_requests.profiles}
                                <div class="flex space-x-4 items-center">
                                    <a href="/{profile.username}">
                                        <Avatar class="w-[69px] !bg-surface-800 border-2 border-surface-600 hover:border-primary-500 transition {$page.url.pathname.startsWith(`/${profile.username}`) ? '!border-primary-500' : ''}" {stexs} userId={profile.user_id} username={profile.username} />
                                    </a>
                                    <div class="w-full space-y-4">
                                        <div class="flex flex-row justify-between space-x-4">
                                            <p class="text-[16px] break-all">{profile.username}</p>
                                            <div class="pt-1 pr-1" title="Friend Request">
                                                <Icon icon="octicon:person-add-16" />
                                            </div>
                                        </div>
                                        <div class="flex flex-row justify-between items-center">
                                            <div class="flex flex-row justify-evenly w-full space-x-1">
                                                <Button on:click={async () => {
                                                    const result = await acceptFriendRequest($userStore.id, profile.user_id, profile.username, flash, profileStore);
    
                                                    if (result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 variant-filled-primary">Accept</Button>
                                                <Button on:click={async () => {
                                                    const result = await deleteFriendRequest(profile.user_id, $userStore.id, flash, profileStore);
    
                                                    if (!result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 bg-surface-800 border border-surface-500">Delete</Button>
                                            </div>
                                            <p class="text-[14px] w-[28px] text-surface-300 text-right pr-1">{formatDistanceStrict(new Date(notification.created_at), new Date())}</p>
                                        </div>
                                    </div>
                                </div>
                            {:else if notification.type === 'organization_request'}
                                {@const organization = notification.organization_requests.organizations}
                                <div class="flex space-x-4 items-center">
                                    <a href="/organizations/{organization.name}" class="group">
                                        <div class="!w-[68px] h-[68px] rounded-md overflow-hidden bg-surface-800 border-2 border-surface-600 flex items-center justify-center transition group-hover:bg-surface-600 group-hover:border-primary-500">
                                            <OrganizationLogo {stexs} organizationId={organization.id} alt={organization.name} iconClass="text-[46px]" />
                                        </div>
                                    </a>
                                    <div class="w-full space-y-4">
                                        <div class="flex flex-row justify-between space-x-4">
                                            <div class="flex flex-row space-x-2 justify-between w-full">
                                                <p class="text-[16px] break-all">{organization.name}</p>
                                                <span title="Role" class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit">{notification.organization_requests.role}</span>
                                            </div>
                                            <div class="pt-1 pr-1" title="Organization Request">
                                                <Icon icon="octicon:organization-16" />
                                            </div>
                                        </div>
                                        <div class="flex flex-row justify-between items-center">
                                            <div class="flex flex-row justify-evenly w-full space-x-1">
                                                <Button on:click={async () => {
                                                    const result = await acceptOrganizationRequest($userStore.id, organization.id, organization.name, notification.organization_requests.role, flash, profileStore);

                                                    if (result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 variant-filled-primary">Accept</Button>
                                                <Button on:click={async () => {
                                                    const result = await deleteOrganizationRequest($userStore.id, organization.id, flash);

                                                    if (result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 bg-surface-800 border border-surface-500">Delete</Button>
                                            </div>
                                            <p class="text-[14px] w-[28px] text-surface-300 text-right pr-1">{formatDistanceStrict(new Date(notification.created_at), new Date())}</p>
                                        </div>
                                    </div>
                                </div>
                            {:else}
                                {@const project = notification.project_requests.projects}
                                <div class="flex space-x-4 items-center">
                                    <a href="/organizations/projects/{project.name}" class="group">
                                        <div class="!w-[68px] h-[68px] rounded-md overflow-hidden bg-surface-800 border-2 border-surface-600 flex items-center justify-center transition group-hover:bg-surface-600 group-hover:border-primary-500">
                                            <ProjectLogo {stexs} projectId={project.id} alt={project.name} iconClass="text-[46px]" />
                                        </div>
                                    </a>
                                    <div class="w-full space-y-4">
                                        <div class="flex flex-row justify-between space-x-4">
                                            <div class="flex flex-row space-x-2 justify-between w-full">
                                                <p class="text-[16px] break-all">
                                                    <a href="/organizations/{project.organizations.name}" class="hover:text-secondary-400 transition">{project.organizations.name}</a> / {project.name}</p>
                                                <span title="Role" class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit">{notification.project_requests.role}</span>
                                            </div>
                                            <div class="pt-1 pr-1" title="Project Request">
                                                <Icon icon="octicon:project-symlink-16" />
                                            </div>
                                        </div>
                                        <div class="flex flex-row justify-between items-center">
                                            <div class="flex flex-row justify-evenly w-full space-x-1">
                                                <Button on:click={async () => {
                                                    const result = await acceptProjectRequest($userStore.id, project.id, project.name, project.organizations.name, notification.project_requests.role, flash, profileStore);

                                                    if (result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 variant-filled-primary">Accept</Button>
                                                <Button on:click={async () => {
                                                    const result = await deleteProjectRequest($userStore.id, project.id, flash);

                                                    if (result) removeNotificationByIndex(index);
                                                }} class="px-2 py-0 sm:px-4 sm:py-1 bg-surface-800 border border-surface-500">Delete</Button>
                                            </div>
                                            <p class="text-[14px] w-[28px] text-surface-300 text-right pr-1">{formatDistanceStrict(new Date(notification.created_at), new Date())}</p>
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else if filter !== 'All' || notifications.length > 0}
                <div class="p-5 w-full text-center whitespace-normal sm:whitespace-pre">
                    {#if filter === 'Friend Requests'}
                        No friend requests found
                    {:else if filter === 'Organization Requests'}
                        No organization requests found
                    {:else if filter === 'Project Requests'}
                        No project requests found
                    {:else}
                        No notifications found
                    {/if}
                </div>
            {:else}
                <div class="p-5 w-full text-center whitespace-normal sm:whitespace-pre">
                    You haven't received any notifications
                </div>
            {/if}
        {/if}
    </div>
</div>


