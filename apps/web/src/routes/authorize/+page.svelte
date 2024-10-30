<script lang="ts">
	import { page } from '$app/stores';
	import { getPreviousPageStore } from '$lib/stores/previousPageStore';
	import { createQuery } from '@tanstack/svelte-query';
	import { getFlash } from 'sveltekit-flash-message/client';
	import { stexs } from '../../stexsClient';
	import type { Session } from 'stexs-client/src/lib/types';
	import { goto } from '$app/navigation';
	import { getUserStore } from '$lib/stores/userStore';
	import { Avatar, Button, OrganizationLogo } from 'ui';
	import Icon from '@iconify/svelte';
	import { RecursiveTreeView, type TreeViewNode } from '@skeletonlabs/skeleton';
	import { scopesTreeViewNodes } from '$lib/utils/scopes';

	const flash = getFlash(page);
	const previousPageStore = getPreviousPageStore();
	const userStore = getUserStore();

	let clientId: string | null = $page.url.searchParams.get('client_id');
	let redirectUrl: string | null = $page.url.searchParams.get('redirect_url');
	let scopes: string[] = $page.url.searchParams.get('scope')?.split(' ') || [];
	let state: string | null = $page.url.searchParams.get('state');

	const pleaseNotify = 'Please notify the application operator.';
	const couldNotProceed =
		'Authorization could not proceed due to the following issues:';

	let filteredNodes: TreeViewNode[] = [];
	let expandedNodes: string[] = [];

	let authorizeSetupQuery = createQuery({
		queryKey: ['authorizeSetup'],
		queryFn: async () => {
			let issues = [];

			if (!clientId) {
				issues.push('missing client ID');
			}

			if (scopes.length === 0) {
				issues.push('missing scope');
			}

			if (scopes.length === 1 && scopes[0] === '') {
				issues.push('missing scopes in the scope query parameter');
			}

			if (!redirectUrl) {
				issues.push('missing redirect URL');
			}

			if (issues.length > 0) {
				let formattedIssues = '';

				if (issues.length === 1) {
					formattedIssues = issues[0];
				} else {
					const lastIssue = issues.pop();
					formattedIssues = issues.join(', ') + ', and ' + lastIssue;
				}

				$flash = {
					message: `${couldNotProceed} ${formattedIssues}. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};

				goto('/');
				return false;
			}

			const session: Session = stexs.auth.getSession();

			if (!session) {
				previousPageStore.set(
					$page.url.pathname + '?' + $page.url.searchParams,
				);
				goto('/sign-in');
				return false;
			}

			const responseClientData = await stexs.rpc(
				'get_oauth2_app_by_client_id',
				{
					client_id_param: clientId,
				},
			);

			if (responseClientData.error) {
				$flash = {
					message: `${couldNotProceed} ${responseClientData.error.message}. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				goto('/');
				return false;
			}

			if (responseClientData.data === 0) {
				$flash = {
					message: `${couldNotProceed} no client found by the provided client ID. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				goto('/');
				return false;
			}

			const clientData = responseClientData.data[0];

			filteredNodes = scopesTreeViewNodes
				.map((node) => {
					const filteredChildren = node.children?.filter((child) =>
						scopes.includes(child.id),
					);
					
					return {
						...node,
						children: filteredChildren,
					};
				})
				.filter(
					(node) =>
						(node.children && node.children.length > 0) || !node.children,
				);

			if (filteredNodes.length === 0) {
				$flash = {
					message: `${couldNotProceed} no valid scopes provided. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				goto('/');
				return false;
			}

			const totalChildCount = filteredNodes.reduce((count, node) => {
				return count + (node.children ? node.children.length : 0);
			}, 0);

			if (totalChildCount <= 6) {
				expandedNodes = filteredNodes.map((node) => node.id);
			}

			return clientData;
		},
	});

	async function authorize() {
		const response = await stexs.auth.oauth.authorize(
			clientId!,
			redirectUrl!,
			scopes,
		);

		if (response.status === 204) {
			goto(`${redirectUrl}${state && state.length > 0 ? `?state=${state}` : ''}`);
			return;
		}

		const body = await response.json();
 
		if (response.status !== 200) {
			if (body.errors && body.errors[0].code === 'CLIENT_NOT_FOUND') {
				$flash = {
					message: `${couldNotProceed} client does not exists by the provided client ID. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				return;
			}

			if (body.errors && body.errors[0].code === 'INVALID_REDIRECT_URL') {
				$flash = {
					message: `${couldNotProceed} the provided redirect URL does not match the client settings. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				return;
			}

			if (body.errors && body.errors[0].code === 'INVALID_SCOPES') {
				const invalidScopes = body.errors[0].data.scopes;

				let formattedScopes = '';

				if (invalidScopes.length === 1) {
					formattedScopes = invalidScopes[0];
				} else {
					const lastIssue = invalidScopes.pop();
					formattedScopes = invalidScopes.join(', ') + ', and ' + lastIssue;
				}

				$flash = {
					message: `${couldNotProceed} the following requested scopes are not configured in the client settings: ${formattedScopes}. ${pleaseNotify}`,
					classes: 'variant-glass-error',
					autohide: false,
				};
				return;
			}

			$flash = {
				message: `Authorization could not proceed due to internal server error. Please try again.`,
				classes: 'variant-glass-error',
				autohide: false,
			};
			return;
		}

		goto(`${redirectUrl}?code=${body.code}&expires=${body.expires}${state && state.length > 0 ? `&state=${state}` : ''}`);
	}
</script>

<div class="flex items-center justify-center h-full flex-col py-[24px]">
	<div class="card p-5 variant-ghost-surface space-y-6 w-full max-w-[400px]">
		<div class="text-center">
			<h3 class="h3 text-primary-500">Authorization</h3>
		</div>
		{#if $authorizeSetupQuery.isLoading || !$authorizeSetupQuery.data}
			<div class="flex flex-row items-center justify-evenly space-x-2">
				<div
					class="w-[60px] h-[60px] xs:w-[80px] xs:h-[80px] rounded-full placeholder animate-pulse"
				/>
				<Icon icon="tabler:dots" width="34" />
				<div
					class="w-[60px] h-[60px] xs:w-[80px] xs:h-[80px] rounded-full placeholder animate-pulse"
				/>
			</div>
			<div class="h-[24px] placeholder animate-pulse w-full" />
			<div class="h-[80px] placeholder animate-pulse w-full" />
			<div class="h-[200px] placeholder animate-pulse w-full" />
			<div class="flex flex-row justify-between">
				<Button
					class="variant-ringed-surface hover:bg-surface-600"
					on:click={() => goto('/')}>Cancel</Button
				>
				<div class="w-[108.71px] h-[42px] placeholder animate-pulse" />
			</div>
			<div class="h-[72px] placeholder animate-pulse w-full" />
		{:else}
			<div class="flex flex-row items-center justify-evenly space-x-2">
				<div
					class="w-[60px] xs:w-[80px] overflow-hidden !rounded-full bg-surface-800 border-2 border-surface-600"
				>
					<OrganizationLogo
						{stexs}
						organizationId={$authorizeSetupQuery.data.organization_id}
						alt={$authorizeSetupQuery.data.organization_name}
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
				{$authorizeSetupQuery.data.name}
			</p>
			<div class="space-y-2">
				<p class="text-center break-all text-[16px]">
					by
					<a
						href="/organizations/{$authorizeSetupQuery.data.organization_name}"
						class="text-secondary-500 hover:text-secondary-400 transition"
						>{$authorizeSetupQuery.data.organization_name}</a
					>
					{$authorizeSetupQuery.data.project_name ? ' for ' : ''}
					{#if $authorizeSetupQuery.data.project_name}
						<a
							href="/organizations/{$authorizeSetupQuery.data
								.organization_name}/projects/{$authorizeSetupQuery.data
								.project_name}"
							class="text-secondary-500 hover:text-secondary-400 transition"
							>{$authorizeSetupQuery.data.project_name}</a
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
						on:click={async () => {
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
					bind:expandedNodes
					hover="hover:bg-surface-700"
				/>
			</div>
			<div class="flex flex-row justify-between">
				<Button
					class="variant-ringed-surface hover:bg-surface-600"
					on:click={() => goto('/')}>Cancel</Button
				>
				<Button class="variant-filled-primary" on:click={authorize}
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
						$authorizeSetupQuery.data.created_at,
					).toLocaleString()}
				</p>
			</div>
		{/if}
	</div>
</div>
