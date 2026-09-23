import boundaries from '@boundaries/eslint-plugin'

const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']

export function createRecommendedConfig(plugin) {
	return [
		{
			files: ['src/{app,pages,widgets,features,entities,shared}/**/*.{ts,tsx}'],
			plugins: { boundaries, jst: plugin },
			settings: {
				'boundaries/elements': layers.map(type => ({ pattern: `src/${type}/**`, type })),
				'boundaries/files': [{ category: 'test', pattern: '**/*.{test,spec}.{ts,tsx}' }],
			},
			rules: {
				'boundaries/dependencies': ['error', {
					default: 'disallow',
					policies: [
						{ from: { file: { categories: 'test' } }, allow: { to: { element: { types: { anyOf: layers } } } } },
						{ from: { element: { types: { anyOf: ['app', 'pages'] } } }, allow: { to: { element: { types: { anyOf: layers } } } } },
						{ from: { element: { type: 'widgets' } }, allow: { to: { element: { types: { anyOf: ['widgets', 'features', 'entities', 'shared'] } } } } },
						{ from: { element: { type: 'features' } }, allow: { to: { element: { types: { anyOf: ['features', 'entities', 'shared'] } } } } },
						{ from: { element: { type: 'entities' } }, allow: { to: { element: { types: { anyOf: ['entities', 'shared'] } } } } },
						{ from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
					],
				}],
				'complexity': ['error', 12],
				'jst/effects-at-boundary': 'error',
				'jst/file-contract': 'error',
				'max-depth': ['error', 3],
				'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
				'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
				'max-params': ['error', 4],
			},
		},
		{
			files: ['src/{widgets,features,entities}/*/ui/**/*.{ts,tsx}'],
			rules: {
				'no-restricted-imports': ['error', {
					patterns: [{
						group: ['@/app/**', '**/*.injector', '**/*.store', '**/data/**', '**/repository/**', '**/services/**'],
						message: 'UI receives state and actions through props. Keep DI and orchestration in the entry or composition root.',
					}],
				}],
			},
		},
	]
}
