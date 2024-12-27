<script lang="ts">
	import MFA from '../components/MFA/MFA.svelte';
	import StexsClient from 'stexs-client';
	import { Modal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		stexs: StexsClient;
		types: string[];
		confirm: (
			code: string,
			type: string
		) => Promise<Array<{ message: string }> | void>;
		open: boolean;
	}

	let {
		stexs,
		types,
		confirm,
		open = $bindable(false)
	}: Props = $props();

	const cancel = () => {
		open = false;
	};
</script>

<Modal
	bind:open
>
	{#snippet content()}
		<MFA
			{stexs}
			{types}
			{cancel}
			{confirm}
		/>
	{/snippet}
</Modal>
