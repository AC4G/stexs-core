import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const stexsTheme: CustomThemeConfig = {
    name: 'stexs',
    properties: {
		// =~= Theme Properties =~=
		"--theme-font-family-base": `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
		"--theme-font-family-heading": `system-ui`,
		"--theme-font-color-base": "0 0 0",
		"--theme-font-color-dark": "255 255 255",
		"--theme-rounded-base": "6px",
		"--theme-rounded-container": "6px",
		"--theme-border-base": "1px",
		// =~= Theme On-X Colors =~=
		"--on-primary": "0 0 0",
		"--on-secondary": "255 255 255",
		"--on-tertiary": "0 0 0",
		"--on-success": "0 0 0",
		"--on-warning": "0 0 0",
		"--on-error": "255 255 255",
		"--on-surface": "255 255 255",
		// =~= Theme Colors  =~=
		// primary | #0FBA81 
		"--color-primary-50": "219 245 236", // #dbf5ec
		"--color-primary-100": "207 241 230", // #cff1e6
		"--color-primary-200": "195 238 224", // #c3eee0
		"--color-primary-300": "159 227 205", // #9fe3cd
		"--color-primary-400": "87 207 167", // #57cfa7
		"--color-primary-500": "15 186 129", // #0FBA81
		"--color-primary-600": "14 167 116", // #0ea774
		"--color-primary-700": "11 140 97", // #0b8c61
		"--color-primary-800": "9 112 77", // #09704d
		"--color-primary-900": "7 91 63", // #075b3f
		// secondary | #8f2cf2 
		"--color-secondary-50": "238 223 253", // #eedffd
		"--color-secondary-100": "233 213 252", // #e9d5fc
		"--color-secondary-200": "227 202 252", // #e3cafc
		"--color-secondary-300": "210 171 250", // #d2abfa
		"--color-secondary-400": "177 107 246", // #b16bf6
		"--color-secondary-500": "143 44 242", // #8f2cf2
		"--color-secondary-600": "129 40 218", // #8128da
		"--color-secondary-700": "107 33 182", // #6b21b6
		"--color-secondary-800": "86 26 145", // #561a91
		"--color-secondary-900": "70 22 119", // #461677
		// tertiary | #0EA5E9 
		"--color-tertiary-50": "219 242 252", // #dbf2fc
		"--color-tertiary-100": "207 237 251", // #cfedfb
		"--color-tertiary-200": "195 233 250", // #c3e9fa
		"--color-tertiary-300": "159 219 246", // #9fdbf6
		"--color-tertiary-400": "86 192 240", // #56c0f0
		"--color-tertiary-500": "14 165 233", // #0EA5E9
		"--color-tertiary-600": "13 149 210", // #0d95d2
		"--color-tertiary-700": "11 124 175", // #0b7caf
		"--color-tertiary-800": "8 99 140", // #08638c
		"--color-tertiary-900": "7 81 114", // #075172
		// success | #46cb15 
		"--color-success-50": "227 247 220", // #e3f7dc
		"--color-success-100": "218 245 208", // #daf5d0
		"--color-success-200": "209 242 197", // #d1f2c5
		"--color-success-300": "181 234 161", // #b5eaa1
		"--color-success-400": "126 219 91", // #7edb5b
		"--color-success-500": "70 203 21", // #46cb15
		"--color-success-600": "63 183 19", // #3fb713
		"--color-success-700": "53 152 16", // #359810
		"--color-success-800": "42 122 13", // #2a7a0d
		"--color-success-900": "34 99 10", // #22630a
		// warning | #e4af11 
		"--color-warning-50": "251 243 219", // #fbf3db
		"--color-warning-100": "250 239 207", // #faefcf
		"--color-warning-200": "248 235 196", // #f8ebc4
		"--color-warning-300": "244 223 160", // #f4dfa0
		"--color-warning-400": "236 199 88", // #ecc758
		"--color-warning-500": "228 175 17", // #e4af11
		"--color-warning-600": "205 158 15", // #cd9e0f
		"--color-warning-700": "171 131 13", // #ab830d
		"--color-warning-800": "137 105 10", // #89690a
		"--color-warning-900": "112 86 8", // #705608
		// error | #d32727 
		"--color-error-50": "248 223 223", // #f8dfdf
		"--color-error-100": "246 212 212", // #f6d4d4
		"--color-error-200": "244 201 201", // #f4c9c9
		"--color-error-300": "237 169 169", // #eda9a9
		"--color-error-400": "224 104 104", // #e06868
		"--color-error-500": "211 39 39", // #d32727
		"--color-error-600": "190 35 35", // #be2323
		"--color-error-700": "158 29 29", // #9e1d1d
		"--color-error-800": "127 23 23", // #7f1717
		"--color-error-900": "103 19 19", // #671313
		// surface | #2f3137 
		"--color-surface-50": "224 224 225", // #e0e0e1
		"--color-surface-100": "213 214 215", // #d5d6d7
		"--color-surface-200": "203 204 205", // #cbcccd
		"--color-surface-300": "172 173 175", // #acadaf
		"--color-surface-400": "109 111 115", // #6d6f73
		"--color-surface-500": "47 49 55", // #2f3137
		"--color-surface-600": "42 44 50", // #2a2c32
		"--color-surface-700": "35 37 41", // #232529
		"--color-surface-800": "28 29 33", // #1c1d21
		"--color-surface-900": "23 24 27", // #17181b
		
	}
}
