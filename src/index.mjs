import { createRecommendedConfig } from './configs/recommended.config.mjs'
import { createPolicy, defaultPolicy } from './configs/defaultPolicy.config.mjs'
import { disableDirective } from './rules/disableDirective.rule.mjs'
import { effectsAtBoundary } from './rules/effectsAtBoundary.rule.mjs'
import { fileContract } from './rules/fileContract.rule.mjs'
import { importContract } from './rules/importContract.rule.mjs'
import { uiContract } from './rules/uiContract.rule.mjs'
import packageMetadata from '../package.json' with { type: 'json' }

const plugin = {
	meta: { name: packageMetadata.name, version: packageMetadata.version },
	configs: {},
	rules: {
		'disable-directive': disableDirective,
		'effects-at-boundary': effectsAtBoundary,
		'file-contract': fileContract,
		'import-contract': importContract,
		'ui-contract': uiContract,
	},
}

plugin.configs.recommended = createRecommendedConfig(plugin)
plugin.createConfig = overrides => createRecommendedConfig(plugin, overrides)
plugin.defaultPolicy = defaultPolicy

export const defineConfig = createPolicy

export default plugin
