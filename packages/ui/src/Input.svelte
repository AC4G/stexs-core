<script lang="ts">
	import { type Snippet } from 'svelte';
	
	interface Props {
		ref?: HTMLInputElement | undefined;
		field?: string;
		value?: string | boolean | undefined | null;
		checked?: boolean;
		labelClass?: string;
		inputClass?: string;
		withLabel?: boolean;
		labelAfter?: boolean;
		children?: Snippet
		[key: string]: any
	}

	let {
		ref = $bindable(undefined),
		field = '',
		value = $bindable(''),
		checked = $bindable(false),
		labelClass = 'label',
		inputClass = 'input',
		withLabel = true,
		labelAfter = false,
		children,
		...rest
	}: Props = $props();
</script>

{#if rest.type === 'checkbox'}
	{#if withLabel}
		<label for={field} class={labelClass}>
			{#if labelAfter}
				<input
					bind:this={ref}
					id={field}
					class={inputClass}
					type="checkbox"
					bind:checked
					{...rest}
				/>
				<span>{@render children?.()}</span>
			{:else}
				<span>{@render children?.()}</span>
				<input
					bind:this={ref}
					id={field}
					class={inputClass}
					type="checkbox"
					bind:checked
					{...rest}
				/>
			{/if}
		</label>
	{:else}
		<input
			bind:this={ref}
			id={field}
			class={inputClass}
			type="checkbox"
			bind:checked
			{...rest}
		/>
	{/if}
{:else if withLabel}
	<label for={field} class="{labelClass} w-full">
		{#if labelAfter}
			<input
				bind:this={ref}
				id={field}
				class={inputClass}
				bind:value
				{...rest}
			/>
			<span>{@render children?.()}</span>
		{:else}
			<span>{@render children?.()}</span>
			<input
				bind:this={ref}
				id={field}
				class={inputClass}
				bind:value
				{...rest}
			/>
		{/if}
	</label>
{:else}
	<input
		bind:this={ref}
		id={field}
		class={inputClass}
		bind:value
		{...rest}
	/>
{/if}
