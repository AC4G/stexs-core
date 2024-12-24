<script lang="ts">
	import TreeViewItem from './TreeViewItem.svelte';
	import RecursiveTreeViewItem from './RecursiveTreeViewItem.svelte';
	import type { TreeViewNode } from './types.js';
	import { getContext, onMount } from 'svelte';

	interface Props {
		nodes: TreeViewNode[];
		expandedNodes: string[];
		disabledNodes: string[];
		checkedNodes: string[];
		indeterminateNodes: string[];
		treeItems: TreeViewNode[];
	}

	let {
		nodes = [],
		expandedNodes = $bindable([]),
		disabledNodes = $bindable([]),
		checkedNodes = $bindable([]),
		indeterminateNodes = $bindable([]),
		treeItems = $bindable([])
	}: Props = $props();

	// Context API
	let selection: boolean = getContext('selection');
	let multiple: boolean = getContext('multiple');
	let relational: boolean = getContext('relational');

	// Locals
	let group: unknown = $state(multiple ? [] : '');
	let name = $state('');

	function toggleNode(node: TreeViewNode, open: boolean) {
		// toggle only nodes with children
		if (!node.nodes?.length) return;
		if (open) {
			// node is not registered as opened
			if (!expandedNodes.includes(node.id)) {
				expandedNodes.push(node.id);
				expandedNodes = expandedNodes;
			}
		} else {
			// node is registered as open
			if (expandedNodes.includes(node.id)) {
				expandedNodes.splice(expandedNodes.indexOf(node.id), 1);
				expandedNodes = expandedNodes;
			}
		}
	}

	function checkNode(node: TreeViewNode, checked: boolean, indeterminate: boolean) {
		if (checked) {
			// node is not registered as checked
			if (!checkedNodes.includes(node.id)) {
				checkedNodes.push(node.id);
				checkedNodes = checkedNodes;
			}

			// node is not indeterminate but registered as indeterminate
			if (!indeterminate && indeterminateNodes.includes(node.id)) {
				indeterminateNodes.splice(indeterminateNodes.indexOf(node.id), 1);
				indeterminateNodes = indeterminateNodes;
			}
		} else {
			// node is registered as checked
			if (checkedNodes.includes(node.id)) {
				checkedNodes.splice(checkedNodes.indexOf(node.id), 1);
				checkedNodes = checkedNodes;
			}

			// node is indeterminate but not registered as indeterminate
			if (indeterminate && !indeterminateNodes.includes(node.id)) {
				indeterminateNodes.push(node.id);
				indeterminateNodes = indeterminateNodes;
				// node is not indeterminate but registered as indeterminate
			} else if (!indeterminate && indeterminateNodes.includes(node.id)) {
				indeterminateNodes.splice(indeterminateNodes.indexOf(node.id), 1);
				indeterminateNodes = indeterminateNodes;
			}
		}
	}

	if (selection) {
		if (multiple) {
			nodes.forEach((node) => {
				if (!Array.isArray(group)) return;
				if (checkedNodes.includes(node.id) && !group.includes(node.id)) {
					group.push(node.id);
				}
			});
			group = group;
		} else {
			nodes.forEach((node) => {
				if (checkedNodes.includes(node.id) && group !== node.id) {
					group = node.id;
				}
			});
		}
	}

	onMount(async () => {
		if (selection) {
			// random number as name
			name = String(Math.random());

			// remove relational links
			if (!relational) treeItems = [];
		}
	});

	let children: TreeViewItem[][] = [];
</script>

{#if nodes && nodes.length > 0}
	{#each nodes as node, i}
		<TreeViewItem
			bind:this={treeItems[i]}
			bind:children={children[i]}
			bind:group
			bind:name
			bind:value={node.id}
			hideLead={!node.lead}
			hideChildren={!node.nodes || node.nodes.length === 0}
			open={expandedNodes.includes(node.id)}
			disabled={disabledNodes.includes(node.id)}
			checked={checkedNodes.includes(node.id)}
			indeterminate={indeterminateNodes.includes(node.id)}
			on:toggle={(e) => toggleNode(node, e.detail.open)}
			on:groupChange={(e) => checkNode(node, e.detail.checked, e.detail.indeterminate)}
			on:click={() => {
				//
			}}
			on:toggle={() => {
				//
			}}
		>
			{#if typeof node.content === 'string'}
				{@html node.content}
			{:else}
				<svelte:component this={node.content} {...node.contentProps} />
			{/if}
			<svelte:fragment slot="lead">
				{#if typeof node.lead === 'string'}
					{@html node.lead}
				{:else}
					<svelte:component this={node.lead} {...node.leadProps} />
				{/if}
			</svelte:fragment>
			<svelte:fragment slot="children">
				<RecursiveTreeViewItem
					nodes={node.nodes}
					bind:expandedNodes
					bind:disabledNodes
					bind:checkedNodes
					bind:indeterminateNodes
					bind:treeItems={children[i]}
					on:click={(e) =>
						dispatch('click', {
							id: e.detail.id
						})}
					on:toggle={(e) =>
						dispatch('toggle', {
							id: e.detail.id
						})}
				/>
			</svelte:fragment>
		</TreeViewItem>
	{/each}
{/if}
