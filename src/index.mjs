import architecture from '@jst-stack/eslint-plugin-architecture'
import { createRecommendedConfig } from './configs/recommended.config.mjs'
import { createPolicy, defaultPolicy } from './configs/defaultPolicy.config.mjs'
import packageMetadata from '../package.json' with { type: 'json' }

const plugin = {
	meta: { name: packageMetadata.name, version: packageMetadata.version },
	configs: {},
	rules: architecture.rules,
}

plugin.configs.recommended = createRecommendedConfig(defaultPolicy)
plugin.createConfig = overrides => createRecommendedConfig(createPolicy(overrides))
plugin.defaultPolicy = defaultPolicy

export const defineConfig = createPolicy

export default plugin
