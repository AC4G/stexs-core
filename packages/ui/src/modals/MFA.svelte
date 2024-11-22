<script lang="ts">
	import { SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import MFA from '../MFA.svelte';
	import StexsClient from 'stexs-client';

	interface Props {
		parent: SvelteComponent;
	}

	let { parent }: Props = $props();

	const modalStore = getModalStore();

	let stexs: StexsClient = $modalStore[0].meta.stexsClient;
	let flash = $modalStore[0].meta.flash;
	let types = $modalStore[0].meta.types;
	let confirmMFA = $modalStore[0].meta.confirmMFA;

	const cancel = () => modalStore.close();
</script>

{#if $modalStore[0]}
	<MFA {stexs} {flash} {types} {cancel} confirm={confirmMFA} />
{/if}
