import { createPolicy } from './defaultPolicy.config.mjs'
import importPlugin from 'eslint-plugin-import-x'

export function createRecommendedConfig(plugin, overrides) {
	const policy = createPolicy(overrides)
	const layerGlob = Object.keys(policy.imports.layers).join(',')
	const slicedLayerGlob = policy.imports.slicedLayers.join(',')
	const uiForbiddenImports = policy.ui.forbiddenImportPatterns
		.map(pattern => pattern.replaceAll('{alias}', policy.imports.alias))
	return [
		{
			files: [`src/{${layerGlob}}/**/*.{js,jsx,mjs,ts,tsx}`],
			linterOptions: { reportUnusedDisableDirectives: 'error' },
			plugins: { 'import-x': importPlugin, jst: plugin },
			rules: {
				'complexity': ['error', policy.limits.complexity],
				'import-x/no-cycle': ['error', { ignoreExternal: true }],
				'jst/effects-at-boundary': ['error', policy.effects],
				'jst/disable-directive': 'error',
				'jst/file-contract': ['error', policy.files],
				'jst/import-contract': ['error', policy],
				'jst/ui-contract': ['error', policy.ui],
				'max-depth': ['error', policy.limits.maxDepth],
				'max-lines': ['error', { max: policy.limits.maxLines, skipBlankLines: true, skipComments: true }],
				'max-lines-per-function': ['error', { max: policy.limits.maxLinesPerFunction, skipBlankLines: true, skipComments: true }],
				'max-params': ['error', policy.limits.maxParams],
			},
		},
		{
			files: [`src/{${slicedLayerGlob}}/*/ui/**/*.{js,jsx,mjs,ts,tsx}`],
			rules: {
				'no-restricted-imports': ['error', {
					patterns: [{
						group: uiForbiddenImports,
						message: 'UI receives state and actions through props. Keep DI and orchestration in the entry or composition root.',
					}],
				}],
			},
		},
		...policy.exceptions.map(exception => ({
			files: exception.files,
			name: `jst/exception: ${exception.reason}`,
			rules: Object.fromEntries(exception.rules.map(rule => [rule, 'off'])),
		})),
	]
}
