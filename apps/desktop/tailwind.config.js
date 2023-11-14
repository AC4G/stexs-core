import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { stexsTheme } from '../../packages/ui/stexsTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "../../packages/ui/**/*.{html,js,svelte,ts}",
    join(require.resolve(
			'@skeletonlabs/skeleton'),
			'../**/*.{html,js,svelte,ts}'
		)
  ],
  theme: {
    extend: {},
  },
  plugins: [
    skeleton({
      themes: {
        custom: [
          stexsTheme
        ]
      }
    })
  ],
}
