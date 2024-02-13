import type { ToastSettings } from '@skeletonlabs/skeleton';
import type { Writable } from 'svelte/store';

export async function initializeCopyButtonListener(
  flash: Writable<ToastSettings>,
) {
  document.addEventListener('click', async (event: MouseEvent) => {
    const targetElement = event.target as Element;

    if (!targetElement.classList.contains('copy-code')) return;

    const codeBlock = targetElement.closest('.codeblock');

    if (!codeBlock) return;

    const codeElement = codeBlock.querySelector('code');

    if (codeElement) {
      const codeText = codeElement.textContent as string;
      await copyToClipboard(codeText, flash);
    }
  });
}

export async function copyToClipboard(
  text: string,
  flash: Writable<ToastSettings>,
) {
  await navigator.clipboard.writeText(text);
  flash.set({
    message: `Copied to clipboard`,
    classes: 'variant-glass-secondary',
    timeout: 3000,
  });
}
