<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { clipboard, ProgressRadial } from '@skeletonlabs/skeleton';


	interface Props {
		submitted?: boolean;
		type?: 'button' | 'submit' | 'reset';
		title?: string | undefined;
		loader?: boolean;
		loadingText?: string;
		progressClass?: string;
		loaderMeter?: string;
		loaderTrack?: string;
		clipboardData?: string | undefined;
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let {
		submitted = rest.submitted || false,
		type = 'button',
		title = undefined,
		loader = true,
		loadingText = 'processing...',
		progressClass = 'w-[24px]',
		loaderMeter = 'stroke-surface-50',
		loaderTrack = '',
		clipboardData = undefined,
		children,
		...rest
	}: Props = $props();
</script>

<button
	use:clipboard={clipboardData}
	onclick={bubble('click')}
	onmouseover={bubble('mouseover')}
	onmouseenter={bubble('mouseenter')}
	onmouseleave={bubble('mouseleave')}
	onfocus={bubble('focus')}
	{type}
	{title}
	class={submitted
		? rest.class + ' opacity-50 cursor-not-allowed btn'
		: rest.class + ' btn'}
	{...rest.disabled ? { disabled: true } : {}}
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
		{@render children?.()}
	{/if}
</button>
