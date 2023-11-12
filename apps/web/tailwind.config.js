import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';

/** @type {import('tailwindcss').Config} */
export default {
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
        preset: ['gold-nouveau']
      }
    })
  ],
}

