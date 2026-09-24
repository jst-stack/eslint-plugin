import { createRecommendedConfig } from './configs/recommended.config.mjs'
import { effectsAtBoundary } from './rules/effectsAtBoundary.rule.mjs'
import { fileContract } from './rules/fileContract.rule.mjs'

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
