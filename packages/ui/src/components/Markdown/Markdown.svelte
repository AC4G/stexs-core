<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import hljs from 'highlight.js';
	import Convert from 'ansi-to-html';

	interface Props {
		text: string;
		class?: string;
	}

	let { 
		text,
		...rest
	}: Props = $props();

	const convert = new Convert();

	const purifyConfig = {
		ADD_ATTR: ['target', 'onclick'],
	};

	marked.use({
		gfm: true,
		breaks: true,
		renderer: {
			heading(text, level) {
				const id = text.toLowerCase().replace(/[^\w]+/g, '-');

				return `
					<h${level} class="h${level} flex flex-row items-center group" id="${id}" dir="auto">
						${text}
						<a class="anchor !text-white opacity-0 group-hover:opacity-100" href="#${id}" aria-hidden="true" tabindex="-1">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
								<path fill="currentColor" d="m7.775 3.275l1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0a.751.751 0 0 1 .018-1.042a.751.751 0 0 1 1.042-.018a1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018a.751.751 0 0 1-.018-1.042m-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018a.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0a.751.751 0 0 1-.018 1.042a.751.751 0 0 1-1.042.018a1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83"/>
							</svg>
						</a>
					</h${level}>
				`;
			},
			link(href, title, text) {
				return `
					<a target="_blank" rel="noopener noreferrer nofollow" href="${href}" title="${title}" class="text-secondary-500 hover:text-secondary-400 visited:text-secondary-400 transition">${text}</a>
				`;
			},
			codespan(text) {
				return `
					<code class="pre p-1 bg-surface-900">${text}</code>
				`;
			},
			code(code, language) {
				if (code.length === 0) return;

				if (language === 'ansi') code = convert.toHtml(code);

				const validLang = !!(language && hljs.getLanguage(language));

				const highlighted = validLang
					? hljs.highlight(code, { language }).value
					: code;

				return `
					<div class="codeblock relative">
						<pre class="codeblock-pre"><code class="text-[14px] hljs codeblock-code ${language} language-${language} whitespace-pre rounded-md">${highlighted}</code><button type="button" class="fill-white bg-surface-700 border border-surface-500 absolute btn top-[1.6px] right-[1.6px] p-2 copy-code">
							<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true">
								<path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
								<path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
							</svg>
						</button></pre>
					</div>
				`;
			},
			table(header, body) {
				return `
					<table class="table !w-fit border-separate border !border-surface-500 border-spacing-0" role="grid">
						<thead class="table-head">${header}</thead>
						<tbody class="table-body">${body}</tbody>
					</table>
				`;
			},
			hr() {
				return `<hr class="!border-t-2"></hr>`;
			},
			list(body, ordered) {
				return `
					<ol class="${ordered ? 'list-decimal' : 'list-disc'} pl-[20px]">${body}</ol>
				`;
			},
			blockquote(quote) {
				let borderColor = '';

				if (quote.includes('[!NOTE]')) {
					borderColor += ' border-l-tertiary-500';
					quote = quote.replace(
						/\[!NOTE\]/g,
						`
							<span class="icon-note not-italic flex flex-row items-center text-tertiary-500">
								<svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
									<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
										<circle cx="12" cy="12" r="10"/>
										<path d="M12 16v-4m0-4h.01"/>
									</g>
								</svg>
								Note
							</span>
						`,
					);
				} else if (quote.includes('[!TIP]')) {
					borderColor += ' border-l-success-500';
					quote = quote.replace(
						/\[!TIP\]/g,
						`
							<span class="icon-note not-italic flex flex-row items-center text-success-500">
								<svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
									<path fill="currentColor" d="M12 2.5c-3.81 0-6.5 2.743-6.5 6.119c0 1.536.632 2.572 1.425 3.56c.172.215.347.422.527.635l.096.112c.21.25.427.508.63.774c.404.531.783 1.128.995 1.834a.75.75 0 0 1-1.436.432c-.138-.46-.397-.89-.753-1.357a18.111 18.111 0 0 0-.582-.714l-.092-.11c-.18-.212-.37-.436-.555-.667C4.87 12.016 4 10.651 4 8.618C4 4.363 7.415 1 12 1s8 3.362 8 7.619c0 2.032-.87 3.397-1.755 4.5c-.185.23-.375.454-.555.667l-.092.109c-.21.248-.405.481-.582.714c-.356.467-.615.898-.753 1.357a.751.751 0 0 1-1.437-.432c.213-.706.592-1.303.997-1.834c.202-.266.419-.524.63-.774l.095-.112c.18-.213.355-.42.527-.634c.793-.99 1.425-2.025 1.425-3.561C18.5 5.243 15.81 2.5 12 2.5M8.75 18h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5m.75 3.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75"/>
								</svg>
								Tip
							</span>
						`,
					);
				} else if (quote.includes('[!IMPORTANT]')) {
					borderColor += ' border-l-secondary-500';
					quote = quote.replace(
						/\[!IMPORTANT\]/g,
						`
							<span class="icon-note not-italic flex flex-row items-center text-secondary-500">
								<svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
									<path fill="currentColor" d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0M9 9a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
								</svg>
								Important
							</span>
						`,
					);
				} else if (quote.includes('[!WARNING]')) {
					borderColor += ' border-l-warning-500';
					quote = quote.replace(
						/\[!WARNING\]/g,
						`
							<span class="icon-note not-italic flex flex-row items-center text-warning-500">
								<svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
									<g fill="none">
										<path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/>
										<path fill="currentColor" d="m13.299 3.148l8.634 14.954a1.5 1.5 0 0 1-1.299 2.25H3.366a1.5 1.5 0 0 1-1.299-2.25l8.634-14.954c.577-1 2.02-1 2.598 0M12 4.898L4.232 18.352h15.536zM12 15a1 1 0 1 1 0 2a1 1 0 0 1 0-2m0-7a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1"/>
									</g>
								</svg>
								Warning
							</span>
						`,
					);
				} else if (quote.includes('[!CAUTION]')) {
					borderColor += ' border-l-error-500';
					quote = quote.replace(
						/\[!CAUTION\]/g,
						`
							<span class="icon-note not-italic flex flex-row items-center text-error-500">
								<svg class="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
									<path fill="currentColor" d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4m0 8a1 1 0 1 1 0-2a1 1 0 0 1 0 2"/>
								</svg>
								Caution
							</span>
						`,
					);
				} else {
					borderColor += ' border-l-primary-500';
				}

				return `<blockquote class="blockquote bg-surface-900 p-2 not-italic ${borderColor}">${quote}</blockquote>`;
			},
		},
	});

	//@ts-ignore
	let parsed = $derived(DOMPurify.sanitize(marked.parse(text), purifyConfig));
</script>

{#if parsed.length > 0}
	<div
		class="bg-surface-800 rounded-md border border-surface-500 p-2 cursor-auto {rest.class}"
		{...rest}
	>
		{@html parsed}
	</div>
{/if}
