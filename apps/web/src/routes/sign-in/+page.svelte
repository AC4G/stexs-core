<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import { signInSetup } from '$lib/services/auth';
	import { Card, CardHeader, SignInForm } from 'ui';
	import { stexs } from '../../stexsClient';

	let code = $page.url.searchParams.get('code');
	let message = $page.url.searchParams.get('message');

	const signInSetupQuery = createQuery({
		queryKey: ['signInSetup'],
		queryFn: async () => await signInSetup(code, message)
	});
</script>

{#if !$signInSetupQuery.isLoading && $signInSetupQuery.data}
	<Card>
		<CardHeader header="Sign In">
			<p>
				Don't have an account?
				<a
					href="/sign-up"
					class="text-secondary-500 hover:text-secondary-400 transition"
					>Sign Up</a
				>
			</p>
		</CardHeader>
		<SignInForm {stexs} />
	</Card>
{/if}
