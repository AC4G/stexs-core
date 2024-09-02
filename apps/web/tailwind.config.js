import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { stexsTheme } from '../../packages/ui/stexsTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  safelist: [
    'absolute'
  ],
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "../../packages/ui/**/*.{html,js,svelte,ts}",
    join(require.resolve(
			'@skeletonlabs/skeleton'),
			'../**/*.{html,js,svelte,ts}'
		)
  ],
  theme: {
    extend: {
      screens: {
        'xs': '512px'
      },
      aspectRatio: {
        '4/3': '4 / 3',
      }
    },
  },
  plugins: [
    skeleton({
      themes: {
        custom: [
          stexsTheme
        ]
      }
    }),
    forms
  ],
}

