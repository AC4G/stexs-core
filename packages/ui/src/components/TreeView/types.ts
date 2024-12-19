import type Icon from '@iconify/svelte';
import type { Snippet } from 'svelte';

export interface TreeViewNode {
	/** Nodes Unique ID */
	id: string;
	/** Main content. accepts HTML or svelte component. */
	content: string | Snippet | typeof Icon;
	/** Main content props. only used when the Content is a svelte component. */
	contentProps?: object;
	/** Lead content. accepts HTML or svelte component. */
	lead?: string | Snippet| typeof Icon;
	/** lead props. only used when the Lead is a svelte component. */
	leadProps?: object;
	/** children nodes. */
	nodes?: TreeViewNode[];
	/** Set the input's value. */
	value?: unknown;
}
