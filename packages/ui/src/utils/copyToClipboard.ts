export async function initializeCopyButtonListener() {
    document.addEventListener('click', async (event: MouseEvent) => {
        const targetElement = event.target as Element;
        
        if (!targetElement?.classList.contains('copy-code')) {
            return;
        }

        const codeBlock = targetElement.closest("pre");
        if (!codeBlock) {
            return;
        }

        const codeElement = codeBlock.querySelector("code");
        if (!codeElement) {
            return;
        }

        const codeText = codeElement.textContent;
        if (codeText) {
            await copyToClipboard(codeText);
        }
    });
}

export async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
}
