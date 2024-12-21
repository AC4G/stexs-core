<script lang="ts">
	import { setContext } from 'svelte';
	import type { CssClasses, TreeViewNode } from '../../index.js';
	import RecursiveTreeViewItem from './RecursiveTreeViewItem.svelte';

	interface Props {
		selection: boolean;
		multiple: boolean;
		relational: boolean;
		nodes: TreeViewNode[];
		expandedNodes: string[];
		disabledNodes: string[];
		checkedNodes: string[];
		indeterminateNodes: string[];
		width: CssClasses;
		spacing: CssClasses;
		padding: CssClasses;
		indent: CssClasses;
		hover: CssClasses;
		rounded: CssClasses;
		caretOpen: CssClasses;
		caretClosed: CssClasses;
		hyphenOpacity: CssClasses;
		regionSummary: CssClasses;
		regionSymbol: CssClasses;
		regionChildren: CssClasses;
		labelledby: string;
		class?: string;
		onClick: (event: CustomEvent<{ id: string }>) => void;
		onToggle: (event: CustomEvent<{ id: string }>) => void;
	}

	let {
		selection = false,
		multiple = false,
		relational = false,
		nodes = [],
		expandedNodes = [],
		disabledNodes = [],
		checkedNodes = [],
		indeterminateNodes = [],
		width = 'w-full',
		spacing = 'space-y-1',
		padding = 'py-4 px-4',
		indent = 'ml-4',
		hover = 'hover:variant-soft',
		rounded = 'rounded-container-token',
		caretOpen = 'rotate-180',
		caretClosed = '',
		hyphenOpacity = 'opacity-10',
		regionSummary = '',
		regionSymbol = '',
		regionChildren = '',
		labelledby = '',
		onClick = () => {},
		onToggle = () => {},
		...rest
	}: Props = $props();

	// Context API
	setContext('selection', selection);
	setContext('multiple', multiple);
	setContext('relational', relational);
	setContext('padding', padding);
	setContext('indent', indent);
	setContext('hover', hover);
	setContext('rounded', rounded);
	setContext('caretOpen', caretOpen);
	setContext('caretClosed', caretClosed);
	setContext('hyphenOpacity', hyphenOpacity);
	setContext('regionSummary', regionSummary);
	setContext('regionSymbol', regionSymbol);
	setContext('regionChildren', regionChildren);

	let classesBase = $derived(`${width} ${spacing} ${rest.class ?? ''}`);
</script>

<div 
	class="tree {classesBase}" 
	data-testid="tree" 
	role="tree" 
	aria-multiselectable={multiple} 
	aria-label={labelledby}
>
	{#if nodes && nodes.length > 0}
		<RecursiveTreeViewItem
			{nodes}
			bind:expandedNodes
			bind:disabledNodes
			bind:checkedNodes
			bind:indeterminateNodes
			on:click={onClick}
			on:toggle={onToggle}
		/>
	{/if}
</div>
