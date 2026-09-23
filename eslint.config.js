import js from '@eslint/js'

export default [
	js.configs.recommended,
	{
		files: ['**/*.{js,mjs}'],
		languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
		rules: {
			'curly': ['error', 'all'],
			'no-console': ['error', { allow: ['error', 'log'] }],
			'no-else-return': 'error',
			'object-shorthand': 'error',
			'prefer-const': 'error',
		},
	},
]
