<script lang="ts">
	import { page } from '$app/stores';
	import { getPreviousPageStore } from '$lib/stores/previousPageStore';
	import { createQuery } from '@tanstack/svelte-query';
	import { stexs } from '../../stexsClient';
	import { goto } from '$app/navigation';
	import { getUserStore } from '$lib/stores/userStore';
	import { Avatar, Button, Card, CardHeader, OrganizationLogo } from 'ui';
	import Icon from '@iconify/svelte';
	import { authorize, authorizeSetup } from '$lib/services/auth';

	const previousPageStore = getPreviousPageStore();
	const userStore = getUserStore();

	let clientId: string | null = $page.url.searchParams.get('client_id');
	let redirectUrl: string | null = $page.url.searchParams.get('redirect_url');
	let scopes: string[] = $page.url.searchParams.get('scope')?.split(' ') || [];
	let authState: string | null = $page.url.searchParams.get('state');

	let authorizeSetupQuery = createQuery({
		queryKey: ['authorizeSetup'],
		queryFn: async () => authorizeSetup(clientId, redirectUrl, scopes, $page),
	});
</script>

<Card containerClass="py-[24px]">
	<CardHeader header="Authorization" />
	{#if $authorizeSetupQuery.isLoading || !$authorizeSetupQuery.data}
		<div class="flex flex-row items-center justify-evenly space-x-2">
			<div class="w-[60px] h-[60px] xs:w-[80px] xs:h-[80px] rounded-full placeholder animate-pulse"></div>
			<Icon icon="tabler:dots" width="34" />
			<div class="w-[60px] h-[60px] xs:w-[80px] xs:h-[80px] rounded-full placeholder animate-pulse"></div>
		</div>
		<div class="h-[24px] placeholder animate-pulse w-full"></div>
		<div class="h-[80px] placeholder animate-pulse w-full"></div>
		<div class="h-[200px] placeholder animate-pulse w-full"></div>
		<div class="flex flex-row justify-between">
			<Button
				class="variant-ringed-surface hover:bg-surface-600"
				onclick={() => goto('/')}>Cancel</Button
			>
			<div class="w-[108.71px] h-[42px] placeholder animate-pulse"></div>
		</div>
		<div class="h-[72px] placeholder animate-pulse w-full"></div>
	{:else}
		{@const clientData = $authorizeSetupQuery.data.clientData}
		{@const filteredNodes = $authorizeSetupQuery.data.filteredNodes}
		{@const expandedNodes = $authorizeSetupQuery.data.expandedNodes}

		<div class="flex flex-row items-center justify-evenly space-x-2">
			<div
				class="w-[60px] xs:w-[80px] overflow-hidden !rounded-full bg-surface-800 border-2 border-surface-600"
			>
				<OrganizationLogo
					{stexs}
					organizationId={clientData.organization_id}
					alt={clientData.organization_name}
					iconClass="text-[46px]"
				/>
			</div>
			<Icon icon="tabler:dots" width="34" />
			<Avatar
				{stexs}
				userId={$userStore?.id || ''}
				username={$userStore?.username}
				class="w-[60px] xs:w-[80px] !bg-surface-800 border-2 border-surface-600"
				draggable="false"
			/>
		</div>
		<p class="text-center break-all text-[22px] font-medium">
			{clientData.name}
		</p>
		<div class="space-y-2">
			<p class="text-center break-all text-[16px]">
				by
				<a
					href="/organizations/{clientData.organization_name}"
					class="text-secondary-500 hover:text-secondary-400 transition"
					>{clientData.organization_name}</a
				>
				{clientData.project_name ? ' for ' : ''}
				{#if clientData.project_name}
					<a
						href="/organizations/{clientData.organization_name}/projects/{clientData.project_name}"
						class="text-secondary-500 hover:text-secondary-400 transition"
						>{clientData.project_name}</a
					>
				{/if}
				<br />wants permission for your account to:
			</p>
			<div class="flex flex-row space-x-2 justify-center">
				<p class="text-[14px] break-all text-surface-300">
					Signed in as {$userStore?.username}
				</p>
				<Button
					class="p-0 text-[14px] text-secondary-500 hover:text-secondary-400"
					onclick={async () => {
						await stexs.auth.signOut();
						previousPageStore.set(
							$page.url.pathname + '?' + $page.url.searchParams,
						);
						goto('/sign-in');
					}}>Not you?</Button
				>
			</div>
		</div>
		<div class="bg-surface-900 p-2 overflow-auto rounded-md">
			<p class="px-4 pb-2">This app will be able to:</p>
			<RecursiveTreeView
				nodes={filteredNodes}
				{expandedNodes}
				hover="hover:bg-surface-700"
			/>
		</div>
		<div class="flex flex-row justify-between">
			<Button
				class="variant-ringed-surface hover:bg-surface-600"
				onclick={() => goto('/')}>Cancel</Button
			>
			<Button class="variant-filled-primary" onclick={async () => await authorize(clientId!, redirectUrl!, scopes, authState)}
				>Authorize</Button
			>
		</div>
		<div>
			<p class="text-[14px] text-surface-300 flex flex-row">
				<Icon icon="flowbite:link-outline" class="mt-[5px] mr-1" />
				Authorization will redirect you to: <br />{redirectUrl}
			</p>
			<p class="text-[14px] text-surface-300 flex flex-row">
				<Icon icon="octicon:clock-24" class="mt-[5px] mr-1" />
				App active since: {new Date(
					clientData.created_at,
				).toLocaleString()}
			</p>
		</div>
	{/if}
</Card>
