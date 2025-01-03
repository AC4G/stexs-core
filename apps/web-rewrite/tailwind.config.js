import { skeleton, contentPath } from "@skeletonlabs/skeleton/plugin";
import { StexsTheme } from "ui";

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "media",
	safelist: ["absolute"],
	content: [
    "./src/**/*.{html,js,svelte,ts}",
    "../../packages/ui/**/*.{html,js,svelte,ts}",
    join(require.resolve(
      '@skeletonlabs/skeleton'),
      '../**/*.{html,js,svelte,ts}'
    ),
    contentPath(import.meta.url, 'svelte')
	],
	theme: {
		extend: {},
	},
	plugins: [
		skeleton({
			themes: [
				StexsTheme,
			]
		})
	],
}
