<script lang="ts">
	import { clipboard, ProgressRadial } from '@skeletonlabs/skeleton';

	export let submitted: boolean = $$restProps.submitted || false;
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let title: string | undefined = undefined;
	export let loader: boolean = true;
	export let loadingText: string = 'processing...';
	export let progressClass: string = 'w-[24px]';
	export let loaderMeter: string = 'stroke-surface-50';
	export let loaderTrack: string = '';

	export let clipboardData: string | undefined = undefined;
</script>

<button
	use:clipboard={clipboardData}
	on:click
	on:mouseover
	on:mouseenter
	on:mouseleave
	on:focus
	{type}
	{title}
	class={submitted
		? $$restProps.class + ' opacity-50 cursor-not-allowed btn'
		: $$restProps.class + ' btn'}
	{...$$restProps.disabled ? { disabled: true } : {}}
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
		<slot />
	{/if}
</button>
