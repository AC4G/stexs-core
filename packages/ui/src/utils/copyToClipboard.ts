import { getContext } from 'svelte';
import { type ToastContext } from '@skeletonlabs/skeleton-svelte';

export async function initializeCopyButtonListener() {
	document.addEventListener('click', async (event: MouseEvent) => {
		const targetElement = event.target as Element;

		if (!targetElement.classList.contains('copy-code')) return;

		const codeBlock = targetElement.closest('.codeblock');

		if (!codeBlock) return;

		const codeElement = codeBlock.querySelector('code');

		if (codeElement) {
			const codeText = codeElement.textContent as string;
			await copyToClipboard(codeText);
		}
	});
}

export async function copyToClipboard(
	text: string
) {
	const toast: ToastContext = getContext('toast');

	await navigator.clipboard.writeText(text);

	toast.create({
		title: 'Notice',
		description: 'Copied to clipboard',
		type: 'info',
		duration: 3000
	});
}
