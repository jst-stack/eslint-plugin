import { createRecommendedConfig } from './configs.mjs'
import { effectsAtBoundary } from './rules/effects-at-boundary.mjs'
import { fileContract } from './rules/file-contract.mjs'

const plugin = {
	meta: { name: '@jst-stack/eslint-plugin', version: '0.1.0' },
	configs: {},
	rules: {
		'effects-at-boundary': effectsAtBoundary,
		'file-contract': fileContract,
	},
}

plugin.configs.recommended = createRecommendedConfig(plugin)

export default plugin
