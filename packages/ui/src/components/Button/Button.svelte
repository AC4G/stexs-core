<script lang="ts">
	import { ProgressRing } from '@skeletonlabs/skeleton-svelte';
	import { type Snippet } from 'svelte';
	import { copyToClipboard } from '../../utils/clipboard';

	interface Props {
		children?: Snippet;
		submitted?: boolean;
		loader?: boolean;
		loadingText?: string;
		progressClass?: string;
		meterStroke?: string;
		trackStroke?: string;
		clipboardData?: string | undefined;
		type?: string;
		title?: string;
		class?: string;
		value?: string | null | number;
		onclick?: () => void | Promise<void>;
	}

	let {
		submitted = false,
		type = 'button',
		title,
		loader = true,
		loadingText = 'processing...',
		progressClass = 'w-[24px]',
		meterStroke = 'stroke-surface-50',
		trackStroke = '',
		clipboardData,
		children,
		...rest
	}: Props = $props();

	let buttonClass = $derived(`${rest.class || ''} btn ${submitted ? 'opacity-50 cursor-not-allowed' : ''}`);

	function clipboard() {
		if (clipboardData) {
			submitted = true;

			copyToClipboard(clipboardData);

			submitted = false;
		}
	}

</script>

<button
	{...rest}
	onclick={() => {
		clipboard();
		rest.onclick?.();
	}}
	class={buttonClass}
>
	{#if submitted}
		{#if loader}
			<ProgressRing
				value={null}
				size={'size-14'}
				{meterStroke}
				{trackStroke}
			/>
		{:else}
			{loadingText}
		{/if}
	{:else}
		{@render children?.()}
	{/if}
</button>
