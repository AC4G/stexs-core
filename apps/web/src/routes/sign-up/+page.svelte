<script lang="ts">
	import { Card, CardHeader, SignUpForm } from 'ui';
	import { stexs } from '../../stexsClient';
	import { createQuery } from '@tanstack/svelte-query';
	import { checkUserSignedIn } from '$lib/services/auth';

	const signUpSetupQuery = createQuery({
		queryKey: ['signUpSetup'],
		queryFn: checkUserSignedIn
	});
</script>

{#if $signUpSetupQuery.data}
	<Card>
		<CardHeader header="Sign Up">
			<p>
				Already have an account?
				<a
					href="/sign-in"
					class="text-secondary-500 hover:text-secondary-400 transition"
					>Sign In</a
				>
			</p>
		</CardHeader>
		<SignUpForm {stexs} />
	</Card>
{/if}
