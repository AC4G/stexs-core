<script lang="ts">
	import Button from '../components/Button/Button.svelte';
	import { Modal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		question?: string;
		subText?: string;
		confirmBtnClass?: string;
		confirmBtnMeterStroke?: string;
		confirmBtnTrackStroke?: string;
		confirmBtnText?: string;
		onconfirm?: () => void | Promise<void>;
		oncancel?: () => void | Promise<void>;
		cancelBtnClass?: string;
		cancelBtnMeterStroke?: string;
		cancelBtnTrackStroke?: string;
		cancelBtnText?: string;
		open: boolean;
	}

	let {
		question,
		subText = '',
		confirmBtnClass = 'variant-filled-primary',
		confirmBtnMeterStroke = 'stroke-surface-50',
		confirmBtnTrackStroke = '',
		confirmBtnText = 'Confirm',
		onconfirm,
		oncancel,
		cancelBtnClass = 'variant-ringed-surface hover:bg-surface-600',
		cancelBtnText = 'Cancel',
		cancelBtnMeterStroke = 'stroke-surface-50',
		cancelBtnTrackStroke = '',
		open = $bindable(false)
	}: Props = $props();

	let confirmSubmitted: boolean = $state(false);
	let cancelSubmitted: boolean = $state(false);

	const closeModal = () => {
		open = false;
	}
</script>

<Modal
	bind:open
>
	{#snippet content()}
		<div class="card p-5 space-y-6 flex items-center flex-col">
			<p class="text-[18px] max-w-[320px] font-bold">{question}</p>
			{#if subText.length > 0}
				<p class="text-surface-300 max-w-[320px]">{subText}</p>
			{/if}
			<div class="flex justify-between w-full">
				<Button
					class={cancelBtnClass}
					onclick={async () => {
						if (!oncancel) {
							closeModal();
						}

						cancelSubmitted = true;

						if (oncancel instanceof Promise) {
							await oncancel();
						} else {
							oncancel();
						}
					}}
					meterStroke={cancelBtnMeterStroke}
					trackStroke={cancelBtnTrackStroke}
					submitted={cancelSubmitted}>{cancelBtnText}</Button
				>
				<Button
					onclick={async () => {
						if (!onconfirm) return;

						confirmSubmitted = true;

						if (onconfirm instanceof Promise) {
							await onconfirm();
						} else {
							onconfirm();
						}

						closeModal();
					}}
					class={confirmBtnClass}
					meterStroke={confirmBtnMeterStroke}
					trackStroke={confirmBtnTrackStroke}
					submitted={confirmSubmitted}>{confirmBtnText}</Button
				>
			</div>
		</div>
	{/snippet}
</Modal>
