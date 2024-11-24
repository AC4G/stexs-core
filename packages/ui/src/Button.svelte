<script lang="ts">
	import { clipboard, ProgressRadial } from '@skeletonlabs/skeleton';
	import { type Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		submitted?: boolean;
		loader?: boolean;
		loadingText?: string;
		progressClass?: string;
		loaderMeter?: string;
		loaderTrack?: string;
		clipboardData?: string | undefined;
	}

	let {
		submitted = false,
		type = 'button',
		title,
		loader = true,
		loadingText = 'processing...',
		progressClass = 'w-[24px]',
		loaderMeter = 'stroke-surface-50',
		loaderTrack = '',
		clipboardData,
		children,
		...rest
	}: Props = $props();

	let buttonClass = $derived(`${rest.class || ''} btn ${submitted ? 'opacity-50 cursor-not-allowed' : ''}`);
</script>

<button
	use:clipboard={clipboardData}
	{...rest}
	class={buttonClass}
>
	{#if submitted}
		{#if loader}
			<ProgressRadial
				stroke={40}
				strokeLinecap="round"
				meter={loaderMeter}
				track={loaderTrack}
				class={progressClass}
			/>
		{:else}
			{loadingText}
		{/if}
	{:else}
		{@render children()}
	{/if}
</button>
