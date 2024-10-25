<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { createQuery } from '@tanstack/svelte-query';
	import { getUserStore } from '$lib/stores/userStore';
	import { Button } from 'ui';
	import { stexs } from '../../../stexsClient';
	import {
		openChangePasswordModal,
		openChangeEmailModal,
		openEnableTOTPModal,
		openRemoveTOTPModal,
		openDisableEmailModal,
		openEnableEmailModal,
		openSignOutFromAllSessionsModal,
	} from '$lib/utils/modals/userModals';
	import { getFlash } from 'sveltekit-flash-message/client';
	import { page } from '$app/stores';
	import type { ModalSettings } from '@skeletonlabs/skeleton';

	const userStore = getUserStore();
	const modalStore = getModalStore();
	const flash = getFlash(page);

	let showEmail: boolean = false;
	let enabledMethods: string[];

	function toggleShowEmail() {
		showEmail = !showEmail;
	}

	function isOnlyOneFactorEnabled(): boolean {
		return enabledMethods.length === 1;
	}

	function showCantDisableAllFactorsMessage() {
		$flash = {
			message:
				"You can't disable all authentication methods. At least one method will stay enabled.",
			classes: 'variant-glass-error',
			timeout: 5000,
		};
	}

	function disableEmailFactor() {
		if (isOnlyOneFactorEnabled()) {
			showCantDisableAllFactorsMessage();

			return;
		}

		openDisableEmailModal(authQueryStore, stexs, flash, modalStore);
	}

	function disableTOTPFactor() {
		if (isOnlyOneFactorEnabled()) {
			showCantDisableAllFactorsMessage();

			return;
		}

		openRemoveTOTPModal(authQueryStore, stexs, flash, modalStore);
	}

	const sessionsAmountQuery = createQuery({
		queryKey: ['sessionsAmount'],
		queryFn: async () => {
			return await (await stexs.auth.getActiveSessionsAmount()).json();
		},
		enabled: !!$userStore,
	});

	const authStatusQuery = createQuery({
		queryKey: ['authStatus'],
		queryFn: async () => {
			return await (await stexs.auth.mfa.factorStatus()).json();
		},
		enabled: !!$userStore
	});

	$: if ($authStatusQuery.data) {
		enabledMethods = Object.entries($authStatusQuery.data)
			.filter(([_, value]) => value === true)
			.map(([key, _]) => key);
	}

	async function confirmMFA(code: string, type: 'email' | 'totp') {
		const response = await stexs.auth.signOutFromAllSessions(code, type);

		if (response.ok) {
			$flash = {
				message: 'Successfully signed out from all sessions.',
				classes: 'variant-glass-success',
				timeout: 5000,
			};
			modalStore.close();
			return;
		}

		return (await response.json()).errors;
	}

	function openMFAModal() {
		const modal: ModalSettings = {
			type: 'component',
			component: 'MFA',
			meta: {
				stexsClient: stexs,
				flash,
				types: enabledMethods,
				confirmMFA,
			},
		};
		modalStore.set([modal]);
	}

	$: authQueryStore = $authStatusQuery;
	$: emailHidden =
		$userStore &&
		$userStore.email
			.split('@')
			.map((part) =>
				part.length > 2
					? part[0] + '*'.repeat(part.length - 2) + part.slice(-1)
					: part,
			)
			.join('@');
</script>

<div class="px-[4%] md:px-[8%] grid place-items-center">
	<div class="w-full my-[40px] lg:max-w-[1200px] space-y-6">
		<div class="space-y-2">
			<h2 class="h2">Security</h2>
			<hr class="!border-t-2" />
		</div>
		{#if $userStore}
			<div class="bg-surface-700 rounded-md p-4 border border-surface-600">
				<p class="text-[16px] text-surface-300">Email</p>
				<div class="flex flex-row justify-between items-center space-x-2">
					<div class="flex flex-row items-center space-x-2">
						<p class="text-[16px] break-all">
							{#if showEmail}{$userStore.email}{:else}{emailHidden}{/if}
						</p>
						<Button
							on:click={toggleShowEmail}
							class="variant-ghost-surface px-2 py-1"
							>{#if showEmail}Hide{:else}Show{/if}</Button
						>
					</div>
					<Button
						on:click={() =>
							openChangeEmailModal(
								$userStore.email,
								enabledMethods,
								stexs,
								flash,
								modalStore,
							)}
						class="variant-filled-primary px-2 py-1">Edit</Button
					>
				</div>
			</div>
		{/if}
		<div class="space-y-2">
			<h3 class="h3">Password and Authentication</h3>
			<hr class="!border-t-2" />
		</div>
		<div class="space-y-8">
			<Button
				on:click={() =>
					openChangePasswordModal(enabledMethods, stexs, flash, modalStore)}
				class="variant-filled-primary px-2 py-1">Change Password</Button
			>
			{#if $authStatusQuery.isLoading || !$authStatusQuery.data}
				<div class="space-y-2">
					<div class="placeholder animate-pulse h-[24px] max-w-[129.38px]" />
					<div class="placeholder animate-pulse h-[32px] max-w-[206.64px]" />
				</div>
				<div class="space-y-2">
					<div class="placeholder animate-pulse h-[24px] max-w-[148.16px]" />
					<div class="placeholder animate-pulse h-[32px] max-w-[220.63px]" />
				</div>
			{:else}
				<div class="space-y-2">
					<p class="text-surface-300 w-fit">Authenticator App</p>
					{#if $authStatusQuery.data.totp}
						<Button
							on:click={disableTOTPFactor}
							class="variant-ghost-surface px-2 py-1 text-red-600"
							>Remove Authenticator App</Button
						>
					{:else}
						<Button
							on:click={() =>
								openEnableTOTPModal(authQueryStore, stexs, flash, modalStore)}
							class="variant-filled-primary px-2 py-1"
							>Enable Authenticator App</Button
						>
					{/if}
				</div>
				<div class="space-y-2">
					<p class="text-surface-300 w-fit">Email Authentication</p>
					{#if $authStatusQuery.data.email}
						<Button
							on:click={disableEmailFactor}
							class="variant-ghost-surface px-2 py-1 text-red-600"
							>Disable Email Authentication</Button
						>
					{:else}
						<Button
							on:click={() =>
								openEnableEmailModal(authQueryStore, stexs, flash, modalStore)}
							class="variant-filled-primary px-2 py-1"
							>Enable Email Authentication</Button
						>
					{/if}
				</div>
			{/if}
		</div>
		<div class="space-y-2">
			<h3 class="h3">Session Management</h3>
			<hr class="!border-t-2" />
		</div>
		{#if $sessionsAmountQuery.isLoading || !$sessionsAmountQuery.data}
			<div class="space-y-2">
				<div class="placeholder animate-pulse h-[24px] max-w-[140px]" />
				<div class="placeholder animate-pulse h-[32px] max-w-[203.21px]" />
			</div>
		{:else}
			<div class="space-y-2">
				<p class="text-surface-300 w-fit">
					Active Sessions ({$sessionsAmountQuery.data.amount})
				</p>
				<Button
					class="variant-filled-primary px-2 py-1"
					on:click={() =>
						openSignOutFromAllSessionsModal(modalStore, openMFAModal)}
					>Sign Out from All Sessions</Button
				>
			</div>
		{/if}
	</div>
</div>
