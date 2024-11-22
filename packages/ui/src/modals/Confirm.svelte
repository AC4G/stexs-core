<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Button from '../Button.svelte';

	interface Props {
		parent: SvelteComponent;
	}

	let { parent }: Props = $props();

	const modalStore = getModalStore();

	let submitted: boolean = $state(false);
	let question: string = $modalStore[0].meta.question;
	let subText = $modalStore[0].meta.subText || '';
	let confirmBtnClass: string =
		$modalStore[0].meta.confirmBtnClass || 'variant-filled-primary';
	let confirmBtnLoaderMeter: string =
		$modalStore[0].meta.confirmBtnLoaderMeter || 'stroke-surface-50';
	let confirmBtnLoaderTrack: string =
		$modalStore[0].meta.confirmBtnLoaderTrack || '';
	let confirmBtnText: string = $modalStore[0].meta.confirmBtnText || 'Confirm';
	let close: boolean = $modalStore[0].meta.close ?? true;
</script>

{#if $modalStore[0]}
	<div class="card p-5 space-y-6 flex items-center flex-col">
		<p class="text-[18px] max-w-[320px] font-bold">{question}</p>
		{#if subText.length > 0}
			<p class="text-surface-300 max-w-[320px]">{subText}</p>
		{/if}
		<div class="flex justify-between w-full">
			<Button
				class="variant-ringed-surface hover:bg-surface-600"
				on:click={parent.onClose}>{parent.buttonTextCancel}</Button
			>
			<Button
				on:click={async () => {
					if (close) submitted = true;

					await Promise.resolve(
						$modalStore[0].meta.fn($modalStore[0].meta.fnParams),
					);
					
					if (close) modalStore.close();
				}}
				class={confirmBtnClass}
				loaderMeter={confirmBtnLoaderMeter}
				loaderTrack={confirmBtnLoaderTrack}
				{submitted}>{confirmBtnText}</Button
			>
		</div>
	</div>
{/if}
