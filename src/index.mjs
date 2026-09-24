import { createRecommendedConfig } from './configs/recommended.config.mjs'
import { effectsAtBoundary } from './rules/effectsAtBoundary.rule.mjs'
import { fileContract } from './rules/fileContract.rule.mjs'
import { importContract } from './rules/importContract.rule.mjs'
import { uiContract } from './rules/uiContract.rule.mjs'

const plugin = {
	meta: { name: '@jst-stack/eslint-plugin', version: '0.2.0' },
	configs: {},
	rules: {
		'effects-at-boundary': effectsAtBoundary,
		'file-contract': fileContract,
		'import-contract': importContract,
		'ui-contract': uiContract,
	},
}

plugin.configs.recommended = createRecommendedConfig(plugin)
plugin.createConfig = overrides => createRecommendedConfig(plugin, overrides)

export default plugin
