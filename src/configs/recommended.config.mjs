import { createPolicy } from './defaultPolicy.config.mjs'

export function createRecommendedConfig(plugin, overrides) {
	const policy = createPolicy(overrides)
	const layerGlob = Object.keys(policy.imports.layers).join(',')
	const slicedLayerGlob = policy.imports.slicedLayers.join(',')
	return [
		{
			files: [`src/{${layerGlob}}/**/*.{ts,tsx}`],
			plugins: { jst: plugin },
			rules: {
				'complexity': ['error', policy.limits.complexity],
				'jst/effects-at-boundary': ['error', policy.effects],
				'jst/file-contract': ['error', policy.files],
				'jst/import-contract': ['error', policy.imports],
				'jst/ui-contract': ['error', policy.ui],
				'max-depth': ['error', policy.limits.maxDepth],
				'max-lines': ['error', { max: policy.limits.maxLines, skipBlankLines: true, skipComments: true }],
				'max-lines-per-function': ['error', { max: policy.limits.maxLinesPerFunction, skipBlankLines: true, skipComments: true }],
				'max-params': ['error', policy.limits.maxParams],
			},
		},
		{
			files: [`src/{${slicedLayerGlob}}/*/ui/**/*.{ts,tsx}`],
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
