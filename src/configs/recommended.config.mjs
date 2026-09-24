export function createRecommendedConfig(plugin) {
	return [
		{
			files: ['src/{app,pages,widgets,features,entities,shared}/**/*.{ts,tsx}'],
			plugins: { jst: plugin },
			rules: {
				'complexity': ['error', 12],
				'jst/effects-at-boundary': 'error',
				'jst/file-contract': 'error',
				'jst/import-contract': 'error',
				'jst/ui-contract': 'error',
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
