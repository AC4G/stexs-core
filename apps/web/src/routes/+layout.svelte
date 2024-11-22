<script lang="ts">
	import { run } from 'svelte/legacy';

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
		type PopupSettings,
		ListBoxItem,
		ProgressRadial,
	} from '@skeletonlabs/skeleton';
	import {
		Header,
		Avatar,
		Confirm,
		Button,
		InventoryItem,
		AddFriends,
		CreateOrganization,
		initializeCopyButtonListener,
		SettingsSidebar,
		ChangePassword,
		ChangeEmail,
		EnableTOTP,
		RemoveTOTP,
		DisableEmail,
		EnableEmail,
		Markdown,
		OrganizationLogo,
		ProjectLogo,
		MFAModal,
		ConnectionScopes
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
		DropdownDivider,
		Search,
		Sidebar,
		SidebarGroup,
		SidebarItem,
		SidebarWrapper,
	} from 'flowbite-svelte';
	import {
		createQuery,
		QueryClient,
		QueryClientProvider,
		setQueryClientContext
	} from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { createProfileStore } from '$lib/stores/profileStore';
	import { createPreviousPageStore } from '$lib/stores/previousPageStore';
	import {
		computePosition,
		autoUpdate,
		offset,
		shift,
		flip,
		arrow,
	} from '@floating-ui/dom';
	import { storePopup, getModalStore, popup } from '@skeletonlabs/skeleton';
	import { openAddFriendModal } from '$lib/utils/modals/friendModals';
	import { AuthEvents } from 'stexs-client';
	import lodash from 'lodash';
	import { formatDistanceStrict } from '$lib/utils/formatDistance';
	import { acceptFriendRequest, deleteFriendRequest } from '$lib/utils/friend';
	import {
		acceptOrganizationRequest,
		deleteOrganizationRequest,
	} from '$lib/utils/organizationRequests';
	import {
		acceptProjectRequest,
		deleteProjectRequest,
	} from '$lib/utils/projectRequests';
	interface Props {
		children?: import('svelte').Snippet;
	}

	const { debounce } = lodash;

	let { children }: Props = $props();

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
				refetchOnWindowFocus: false
			},
		}
	});

	setQueryClientContext(queryClient);

	const modalRegistry: Record<string, ModalComponent> = {
		confirm: { ref: Confirm },
		inventoryItem: { ref: InventoryItem },
		addFriends: { ref: AddFriends },
		createOrganization: { ref: CreateOrganization },
		changePassword: { ref: ChangePassword },
		changeEmail: { ref: ChangeEmail },
		enableTOTP: { ref: EnableTOTP },
		removeTOTP: { ref: RemoveTOTP },
		disableEmail: { ref: DisableEmail },
		enableEmail: { ref: EnableEmail },
		MFA: { ref: MFAModal },
		connectionScopes: { ref: ConnectionScopes }
	};
	const excludeRoutes = [
		'/sign-in',
		'/sign-up',
		'/sign-in-confirm',
		'/recovery',
		'/authorize',
	];
	const sidebarRoutes = ['/settings'];
	const addFriendPopup: PopupSettings = {
		event: 'hover',
		target: 'addFriendPopup',
		placement: 'bottom',
	};

	const avatarPopup: PopupSettings = {
		event: 'hover',
		target: 'avatarPopup',
		placement: 'bottom',
	};

	let signedIn: boolean = $state();
	let avatarDropDownOpen: boolean = $state(false);

	flash.subscribe(($flash) => {
		if (!$flash) return;

		toastStore.trigger($flash);
	});

	stexs.auth.onAuthStateChange(async (event) => {
		if (event === AuthEvents.SIGNED_IN) {
			const session = stexs.auth.getSession()!;
			userStore.set({
				id: session.user.id,
				username: session.user.username,
				email: session.user.email,
			});
			signedIn = true;
		}

		if (event === AuthEvents.SIGNED_OUT) {
			userStore.set(null);
			signedIn = false;
			goto('/');
		}

		if (event === AuthEvents.USER_UPDATED) {
			const session = await stexs.auth.updateUserInSession();

			if (session) {
				userStore.set({
					id: session.user.id,
					username: session.user.username,
					email: session.user.email,
				});
			}
		}
	});

	onMount(() => {
		queryClient.mount();

		initializeCopyButtonListener(flash);

		const session = stexs.auth.getSession();

		if (!session) return;

		userStore.set({
			id: session.user.id,
			username: session.user.username,
			email: session.user.email,
		});
		signedIn = true;
	});

	// notifications part

	let initialDataExists: boolean = $state(false);
	let search: string = $state('');
	let previousSearch: string = '';
	let filter: string = $state('All');
	let previousFilter: string = 'All';
	let notificationsWindow: any = $state();
	const notificationsPopup: PopupSettings = {
		event: 'hover',
		target: 'notificationsPopup',
		placement: 'bottom',
	};
	const notificationsWindowPopup: PopupSettings = {
		event: 'click',
		target: 'notificationsWindowPopup',
		placement: 'bottom',
		closeQuery: 'a[href]',
		state: (event) => {
			if (!event.state) {
				markAllNotificationsAsSeen();

				notifications = [];
				search = '';
				previousSearch = '';
				filter = 'All';
				previousFilter = 'All';
			}

			dropDownOpen = event.state;
		},
	};

	let dropDownOpen: boolean = $state(false);
	let notifications: any[] = $state([]);

	const handleSearch = debounce((e: Event) => {
		search = (e.target as HTMLInputElement)?.value || '';
	}, 300);

	async function deleteMessage(id: number): Promise<boolean> {
		const { error } = await stexs.from('notifications').delete().eq('id', id);

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
					seen: true,
				})
				.eq('user_id', $userStore.id);

			unseenNotificationsAmount = 0;
		}
	}

	async function fetchUnseenNotifications(userId: string) {
		const { count } = await stexs
			.from('notifications')
			.select('', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('seen', false);

		if (
			notifications.length > 0 &&
			count > notifications.filter((n) => !n.seen).length
		) {
			let newNotifications = await fetchNotifications(
				userId,
				filter,
				search,
				null,
				true,
			);

			notifications = [...newNotifications, ...notifications];
		}

		return count;
	}

	async function fetchNotifications(
		userId: string,
		filter: string,
		search: string,
		lastId: number | null,
		newest: boolean = false,
	) {
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
			.select(
				`
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
				`,
			)
			.order('id', { ascending: false })
			.eq('user_id', userId);

		if (newest) {
			query.eq('seen', false);
		} else {
			query.limit(10);
		}

		if (lastId) query.lt('id', lastId);

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

	let unseenNotificationsQuery = $derived(createQuery({
		queryKey: ['unseenNotifications'],
		queryFn: async () => await fetchUnseenNotifications($userStore!.id),
		enabled: !!$userStore?.id && !excludeRoutes.includes($page.url.pathname),
		refetchInterval: 5000,
	}));

	let unseenNotificationsAmount;
	run(() => {
		unseenNotificationsAmount = $unseenNotificationsQuery.data || 0;
	});

	let notificationsQuery = $derived(createQuery({
		queryKey: ['notifications'],
		queryFn: async () => {
			const data = await fetchNotifications(
				$userStore!.id,
				filter,
				search,
				null,
			);

			if (data) initialDataExists = true;

			return data;
		},
		enabled: !!$userStore?.id && dropDownOpen,
	}));

	run(() => {
		notifications = $notificationsQuery.data || [];
	});

	async function handleScroll() {
		if (
			notificationsWindow &&
			notificationsWindow.scrollHeight - notificationsWindow.scrollTop <=
				notificationsWindow.clientHeight + 1
		) {
			notifications = [
				...notifications,
				...(await fetchNotifications(
					$userStore!.id,
					filter,
					search,
					notifications.slice(-1)[0].id,
				)),
			];
		}
	}

	function removeNotificationByIndex(index: number) {
		if (!notifications[index].seen) {
			unseenNotificationsAmount -= 1;
		}

		notifications = notifications.filter((_, i) => i !== index);
	}

	//sidebar

	const sidebarActiveClass =
		'flex items-center p-2 rounded-md  variant-glass-primary text-primary-500 pointer-events-none';
	const sidebarNonActiveClass =
		'flex items-center p-2 text-white rounded-md hover:bg-surface-500';
	const sidebarBtnClass =
		'flex items-center p-2 w-full rounded-md transition duration-75 text-white group hover:!bg-surface-500';
</script>

<svelte:head>
	{@html `<script>(${setInitialClassState.toString()})();</script>`}
</svelte:head>

<Toast
	buttonDismiss="btn aspect-square px-2 py-1 variant-ghost-surface"
	zIndex="z-[1000]"
/>
<Modal components={modalRegistry} position="items-center !py-4 !px-0" />
<Drawer regionDrawer="!w-full sm:!w-64">
	<div class="px-4">
		<div class="flex items-center justify-between h-[70px]">
			<h3 class="h3">Navigation</h3>
			<Button
				on:click={() => drawerStore.close()}
				class="p-2 variant-ghost-surface"
			>
				<Icon icon="ph:x-bold" />
			</Button>
		</div>
	</div>
	<hr />
	<Sidebar
		class="w-full xs:hidden"
		activeUrl={$page.url.pathname}
		activeClass={sidebarActiveClass}
		nonActiveClass={sidebarNonActiveClass}
		btnClass={sidebarBtnClass}
	>
		<SidebarWrapper
			class="flex flex-col justify-between h-full !bg-transparent"
		>
			<SidebarGroup>
				<SidebarItem
					label="Add Friends"
					on:click={() => {
						drawerStore.close();
						openAddFriendModal($userStore.id, flash, modalStore, stexs, () => {
							if ($profileStore) {
								$profileStore.refetchFriendsFn();
							}
						});
					}}
				>
					{#snippet icon()}
									
							<Icon icon="octicon:person-add-16" />
						
									{/snippet}
				</SidebarItem>
			</SidebarGroup>
		</SidebarWrapper>
	</Sidebar>
	{#if $page.url.pathname.startsWith('/settings') && $userStore}
		<hr class="xs:hidden" />
		<SettingsSidebar
			activeUrl={$page.url.pathname}
			activeClass={sidebarActiveClass}
			nonActiveClass={sidebarNonActiveClass}
			btnClass={sidebarBtnClass}
		/>
	{/if}
</Drawer>
{#if !excludeRoutes.includes($page.url.pathname)}
	<AppShell
		slotSidebarLeft="bg-surface-700 border-surface-500 w-0 {sidebarRoutes.find(
			(route) => $page.url.pathname.startsWith(route),
		)
			? 'lg:w-64 lg:border-r'
			: '!w-0'}"
	>
		{#snippet header()}
			
				<Header {sidebarRoutes} {drawerStore}>
					{#if !signedIn}
						<a
							href="/sign-in"
							class="btn py-[1px] px-[1px] bg-gradient-to-br variant-gradient-primary-secondary group"
						>
							<div
								class="bg-surface-100-800-token text-white rounded-md px-2 py-1 w-full h-full group-hover:bg-gradient-to-br variant-gradient-primary-secondary"
							>
								Sign In
							</div>
						</a>
						<a href="/sign-up" class="btn variant-ghost-primary py-[4px] px-3"
							>Sign Up</a
						>
					{:else}
						<div class="relative flex items-center space-x-2 w-full justify-end">
							<button
								use:popup={addFriendPopup}
								onclick={() =>
								openAddFriendModal(
									$userStore.id,
									flash,
									modalStore,
									stexs,
									() => {
										if ($profileStore) {
											$profileStore.refetchFriendsFn();
										}
									},
								)}
								class="btn hidden xs:block relative hover:bg-surface-500 rounded-full transition p-3"
							>
								<Icon icon="octicon:person-add-16" width="18" />
								<div
									class="p-2 variant-filled-surface rounded-md !ml-0"
									data-popup="addFriendPopup"
								>
									<p class="text-[14px] break-all">Add Friends</p>
								</div>
							</button>
							<button
								use:popup={notificationsWindowPopup}
								use:popup={notificationsPopup}
								class="btn relative notifications hover:bg-surface-500 rounded-full transition p-3 {dropDownOpen &&
									'bg-surface-500'}"
							>
								<div>
									<div class="relative">
										{#if unseenNotificationsAmount > 0}
											<span
												class="badge-icon variant-filled-primary absolute -top-1 -right-[5px] z-10 w-[8px] h-[8px]"
											></span>
										{/if}
									</div>
									<Icon icon="mdi:bell-outline" width="18" />
									<div
										class="p-2 variant-filled-surface rounded-md"
										data-popup="notificationsPopup"
									>
										<p class="text-[14px] break-all">Notifications</p>
									</div>
								</div>
							</button>
							<div data-popup="notificationsWindowPopup">
								<div
									class="absolute rounded-md right-[-79px] sm:right-[-74px] bg-surface-900 p-2 space-y-2 border border-surface-500 w-[100vw] px-2 xs:w-[400px]"
								>
									{#if $notificationsQuery.isSuccess || search.length > 0 || filter !== 'All'}
										{#if filter !== 'All' && filter !== 'Messages'}
											<Search
												size="md"
												placeholder={'Search by ' +
													filter.split(' ')[0] +
													' Name...'}
												on:input={handleSearch}
												class="!bg-surface-500"
											/>
										{/if}
										<Button
											class="bg-surface-500 border border-gray-600 w-full py-[8px]"
										>
											{filter}<Icon
												icon="iconamoon:arrow-down-2-duotone"
												class="text-[22px]"
											/>
										</Button>
										<Dropdown
											class="rounded-md bg-surface-800 p-2 space-y-2 border border-surface-500"
										>
											<ListBoxItem
												bind:group={filter}
												name="filter"
												value={'All'}
												active="variant-glass-primary text-primary-500"
												hover="hover:variant-filled-surface"
												class="rounded-md px-4 py-2">All</ListBoxItem
											>
											<ListBoxItem
												bind:group={filter}
												name="filter"
												value={'Messages'}
												active="variant-glass-primary text-primary-500"
												hover="hover:variant-filled-surface"
												class="rounded-md px-4 py-2">Messages</ListBoxItem
											>
											<ListBoxItem
												bind:group={filter}
												name="filter"
												value={'Friend Requests'}
												active="variant-glass-primary text-primary-500"
												hover="hover:variant-filled-surface"
												class="rounded-md px-4 py-2">Friend Requests</ListBoxItem
											>
											<ListBoxItem
												bind:group={filter}
												name="filter"
												value={'Organization Requests'}
												active="variant-glass-primary text-primary-500"
												hover="hover:variant-filled-surface"
												class="rounded-md px-4 py-2"
												>Organization Requests</ListBoxItem
											>
											<ListBoxItem
												bind:group={filter}
												name="filter"
												value={'Project Requests'}
												active="variant-glass-primary text-primary-500"
												hover="hover:variant-filled-surface"
												class="rounded-md px-4 py-2">Project Requests</ListBoxItem
											>
										</Dropdown>
									{/if}
									{#if $notificationsQuery.isLoading}
										<div class="flex items-center justify-center py-2">
											<ProgressRadial
												stroke={40}
												value={undefined}
												width="w-[30px]"
											/>
										</div>
									{:else if notifications.length > 0}
										<div
											bind:this={notificationsWindow}
											onscroll={handleScroll}
											class="max-h-[400px] overflow-y-auto space-y-2"
										>
											{#each notifications as notification, index (notification.id)}
												<div
													class="rounded p-2 w-full {notification.seen
														? 'bg-surface-700 border border-surface-600'
														: 'variant-ghost-primary'}"
												>
													{#if notification.type === 'message'}
														<div class="flex flex-row space-x-2">
															<Markdown class="" text={notification.message} />
															<div class="space-y-2">
																<Button
																	on:click={async () => {
																		const result = await deleteMessage(
																			notification.id,
																		);

																		if (result) removeNotificationByIndex(index);
																	}}
																	class="p-1 h-fit variant-ghost-surface"
																>
																	<Icon icon="ph:x-bold" />
																</Button>
																<p
																	class="text-[14px] w-[26px] text-surface-300 text-right pr-1"
																>
																	{formatDistanceStrict(
																		new Date(notification.created_at),
																		new Date(),
																	)}
																</p>
															</div>
														</div>
													{:else if notification.type === 'friend_request'}
														{@const profile =
															notification.friend_requests.profiles}
														<div class="flex space-x-4 items-center">
															<a href="/{profile.username}">
																<Avatar
																	class="w-[48px] xs:w-[69px] !bg-surface-800 border-2 border-surface-600 hover:border-primary-500 transition {$page.url.pathname.split('/')[1].toLowerCase() === profile.username.toLowerCase()
																		? '!border-primary-500'
																		: ''}"
																	{stexs}
																	userId={profile.user_id}
																	username={profile.username}
																/>
															</a>
															<div class="w-full space-y-4">
																<div
																	class="flex flex-row justify-between space-x-4"
																>
																	<p class="text-[16px] break-all">
																		{profile.username}
																	</p>
																	<div class="pt-1 pr-1" title="Friend Request">
																		<Icon icon="octicon:person-add-16" />
																	</div>
																</div>
																<div
																	class="flex flex-row justify-between items-center"
																>
																	<div
																		class="flex flex-row justify-evenly w-full space-x-1"
																	>
																		<Button
																			on:click={async () => {
																				const result = await acceptFriendRequest(
																					$userStore.id,
																					profile.user_id,
																					profile.username,
																					flash,
																					$profileStore,
																				);

																				if (result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 variant-filled-primary"
																			>Accept</Button
																		>
																		<Button
																			on:click={async () => {
																				const result = await deleteFriendRequest(
																					profile.user_id,
																					$userStore.id,
																					flash,
																					$profileStore,
																				);

																				if (!result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 bg-surface-800 border border-surface-500"
																			>Delete</Button
																		>
																	</div>
																	<p
																		class="text-[14px] w-[28px] text-surface-300 text-right pr-1"
																	>
																		{formatDistanceStrict(
																			new Date(notification.created_at),
																			new Date(),
																		)}
																	</p>
																</div>
															</div>
														</div>
													{:else if notification.type === 'organization_request'}
														{@const organization =
															notification.organization_requests.organizations}
														<div class="flex space-x-4 items-center">
															<a
																href="/organizations/{organization.name}"
																class="group"
															>
																<div
																	class="!w-[52px] h-[52px] xs:!w-[68px] xs:h-[68px] rounded-md overflow-hidden bg-surface-800 border-2 border-surface-600 flex items-center justify-center transition group-hover:bg-surface-600 group-hover:border-primary-500"
																>
																	<OrganizationLogo
																		{stexs}
																		organizationId={organization.id}
																		alt={organization.name}
																		iconClass="text-[46px]"
																	/>
																</div>
															</a>
															<div class="w-full space-y-4">
																<div
																	class="flex flex-row justify-between space-x-4"
																>
																	<div
																		class="flex flex-row space-x-2 justify-between w-full"
																	>
																		<p class="text-[16px] break-all">
																			{organization.name}
																		</p>
																		<span
																			title="Role"
																			class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit"
																			>{notification.organization_requests
																				.role}</span
																		>
																	</div>
																	<div
																		class="pt-1 pr-1"
																		title="Organization Request"
																	>
																		<Icon icon="octicon:organization-16" />
																	</div>
																</div>
																<div
																	class="flex flex-row justify-between items-center"
																>
																	<div
																		class="flex flex-row justify-evenly w-full space-x-1"
																	>
																		<Button
																			on:click={async () => {
																				const result =
																					await acceptOrganizationRequest(
																						$userStore.id,
																						organization.id,
																						organization.name,
																						notification.organization_requests
																							.role,
																						flash,
																						$profileStore,
																					);

																				if (result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 variant-filled-primary"
																			>Accept</Button
																		>
																		<Button
																			on:click={async () => {
																				const result =
																					await deleteOrganizationRequest(
																						$userStore.id,
																						organization.id,
																						flash,
																					);

																				if (result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 bg-surface-800 border border-surface-500"
																			>Delete</Button
																		>
																	</div>
																	<p
																		class="text-[14px] w-[28px] text-surface-300 text-right pr-1"
																	>
																		{formatDistanceStrict(
																			new Date(notification.created_at),
																			new Date(),
																		)}
																	</p>
																</div>
															</div>
														</div>
													{:else}
														{@const project =
															notification.project_requests.projects}
														<div class="flex space-x-4 items-center">
															<a
																href="/organizations/projects/{project.name}"
																class="group"
															>
																<div
																	class="!w-[52px] h-[52px] xs:!w-[68px] xs:h-[68px] rounded-md overflow-hidden bg-surface-800 border-2 border-surface-600 flex items-center justify-center transition group-hover:bg-surface-600 group-hover:border-primary-500"
																>
																	<ProjectLogo
																		{stexs}
																		projectId={project.id}
																		alt={project.name}
																		iconClass="text-[46px]"
																	/>
																</div>
															</a>
															<div class="w-full space-y-4">
																<div
																	class="flex flex-row justify-between space-x-4"
																>
																	<div
																		class="flex flex-row space-x-2 justify-between w-full"
																	>
																		<p class="text-[16px] break-words">
																			<a
																				href="/organizations/{project
																					.organizations.name}"
																				class="hover:text-secondary-400 transition"
																				>{project.organizations.name}</a
																			>
																			/ {project.name}
																		</p>
																		<span
																			title="Role"
																			class="badge bg-gradient-to-br variant-gradient-tertiary-secondary h-fit w-fit"
																			>{notification.project_requests.role}</span
																		>
																	</div>
																	<div class="pt-1 pr-1" title="Project Request">
																		<Icon icon="octicon:project-symlink-16" />
																	</div>
																</div>
																<div
																	class="flex flex-row justify-between items-center"
																>
																	<div
																		class="flex flex-row justify-evenly w-full space-x-1"
																	>
																		<Button
																			on:click={async () => {
																				const result = await acceptProjectRequest(
																					$userStore.id,
																					project.id,
																					project.name,
																					project.organizations.name,
																					notification.project_requests.role,
																					flash,
																					$profileStore,
																				);

																				if (result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 variant-filled-primary"
																			>Accept</Button
																		>
																		<Button
																			on:click={async () => {
																				const result = await deleteProjectRequest(
																					$userStore.id,
																					project.id,
																					flash,
																				);

																				if (result)
																					removeNotificationByIndex(index);
																			}}
																			class="px-2 py-0 xs:px-4 xs:py-1 bg-surface-800 border border-surface-500"
																			>Delete</Button
																		>
																	</div>
																	<p
																		class="text-[14px] w-[28px] text-surface-300 text-right pr-1"
																	>
																		{formatDistanceStrict(
																			new Date(notification.created_at),
																			new Date(),
																		)}
																	</p>
																</div>
															</div>
														</div>
													{/if}
												</div>
											{/each}
										</div>
									{:else if filter !== 'All' || notifications.length > 0}
										<div
											class="p-5 w-full text-center whitespace-normal sm:whitespace-pre"
										>
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
										<div
											class="p-5 w-full text-center whitespace-normal sm:whitespace-pre"
										>
											You haven't received any notifications
										</div>
									{/if}
								</div>
							</div>
							<button use:popup={avatarPopup} class="btn relative p-0">
								<Avatar
									{stexs}
									username={$userStore?.username}
									userId={$userStore.id}
									class="avatarDropDown w-[42px] cursor-pointer border-2 border-surface-300-600-token hover:!border-primary-500 {avatarDropDownOpen &&
										'!border-primary-500'} transition"
								/>
								<div
									class="p-2 variant-filled-surface max-w-[80px] w-fit rounded-md right-[-16px] !ml-0"
									data-popup="avatarPopup"
								>
									<p class="text-[14px] break-all">{$userStore?.username}</p>
								</div>
							</button>
							<Dropdown
								triggeredBy=".avatarDropDown"
								activeUrl={$page.url.pathname.startsWith('/settings')
									? '/settings'
									: $page.url.pathname}
								activeClass="variant-glass-primary text-primary-500"
								bind:open={avatarDropDownOpen}
								class="absolute rounded-md right-[-24px] bg-surface-900 p-2 space-y-2 border border-solid border-surface-500"
							>
								<div class="px-4 py-2 rounded variant-ghost-surface">
									<p
										class="text-[16px] bg-gradient-to-br from-primary-500 to-secondary-500 bg-clip-text text-transparent box-decoration-clone break-all"
									>
										{$userStore?.username}
									</p>
								</div>
								<DropdownDivider />
								<DropdownItem
									href="/{$userStore?.username}"
									class="hover:!bg-surface-500 rounded text-[16px]"
									>Profile</DropdownItem
								>
								<DropdownItem
									href="/{$userStore?.username}/friends"
									class="hover:!bg-surface-500 rounded text-[16px]"
									>Friends</DropdownItem
								>
								<DropdownItem
									href="/{$userStore?.username}/organizations"
									class="hover:!bg-surface-500 rounded text-[16px]"
									>Organizations</DropdownItem
								>
								<DropdownItem
									href="/settings"
									class="hover:!bg-surface-500 rounded text-[16px]"
									>Settings</DropdownItem
								>
								<DropdownDivider />
								<DropdownItem
									class="hover:!bg-surface-500 rounded text-[16px]"
									on:click={() => stexs.auth.signOut()}>Sign Out</DropdownItem
								>
							</Dropdown>
						</div>
					{/if}
				</Header>
			
			{/snippet}
		{#snippet sidebarLeft()}
			
				<div class="bg-surface-800 h-full">
					{#if $page.url.pathname.startsWith('/settings') && $userStore}
						<SettingsSidebar
							activeUrl={$page.url.pathname}
							activeClass={sidebarActiveClass}
							nonActiveClass={sidebarNonActiveClass}
							btnClass={sidebarBtnClass}
						/>
					{/if}
				</div>
			
			{/snippet}
		{@render children?.()}
	</AppShell>
{:else}
	<div class="m-[20px] absolute">
		<button
			onclick={() => {
				if ($previousPageStore === '/') {
					window.history.go(-1);
				} else {
					previousPageStore.set('/');
					goto('/');
				}
			}}
			class="btn-icon variant-filled-surface"
			title="Back"
		>
			<Icon icon="ph:arrow-left-bold" />
		</button>
	</div>
	<AppShell>
		<QueryClientProvider client={queryClient}>
			{@render children?.()}
		</QueryClientProvider>
	</AppShell>
{/if}
