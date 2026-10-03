import { strict as assert } from 'node:assert'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { loadPolicy } from '../src/configs/loadPolicy.config.mjs'
import plugin, { defineConfig } from '../src/index.mjs'
import policySchema from '../schema/jst-policy.schema.json' with { type: 'json' }

test('normalizes, validates, and deeply freezes project policy', () => {
	const policy = defineConfig({
		files: { roleDirectories: { controller: 'services' }, testSuffixes: ['spec'] },
		generator: { layers: { entity: 'domain' } },
		imports: { layers: { domain: ['domain', 'shared'] }, slicedLayers: ['domain'] },
		styles: { moduleExtension: 'scss' },
	})

	assert.equal(policy.files.roleDirectories.controller, 'services')
	assert.deepEqual(policy.files.testSuffixes, ['spec'])
	assert.equal(policy.generator.layers.entity, 'domain')
	assert.equal(policy.styles.moduleExtension, 'scss')
	assert.equal(policy.performance.budgets.gzipCssBytes, 50_000)
	assert.deepEqual(policy.performance.budgets.unexpectedChunks, [])
	assert.equal(Object.isFrozen(policy.files.roleDirectories), true)
	assert.throws(() => defineConfig({ files: { typo: true } }), /Unknown JST policy key: files\.typo/u)
	assert.throws(() => defineConfig({ limits: { maxLines: 0 } }), /positive integer/u)
	assert.throws(() => defineConfig({ styles: { moduleExtension: 'less' } }), /must be css or scss/u)
	assert.throws(() => defineConfig({ imports: { slicedLayers: ['missing'] } }), /unknown layer/u)
	assert.throws(() => defineConfig({ generator: { layers: { entity: 'missing' } } }), /unknown layer/u)
	assert.throws(() => defineConfig({ exceptions: [{ files: ['src/legacy/**'], reason: '', rules: ['jst/import-contract'] }] }), /reason is required/u)
	assert.throws(() => defineConfig({ exceptions: [{ expires: '2000-01-01', files: ['src/legacy/**'], reason: 'Migration', rules: ['jst/import-contract'] }] }), /exception expired/u)
})

test('turns reviewed policy exceptions into narrow ESLint overrides', async () => {
	const { default: plugin } = await import('../src/index.mjs')
	const [,, exception] = plugin.createConfig({
		exceptions: [{ files: ['src/legacy/**'], owner: 'platform', reason: 'Remove after migration', rules: ['jst/import-contract'] }],
	})
	assert.deepEqual(exception.files, ['src/legacy/**'])
	assert.deepEqual(exception.rules, { 'jst/import-contract': 'off' })
})

test('derives UI import restrictions from the configured alias and policy patterns', () => {
	const [, uiConfig] = plugin.createConfig({
		imports: { alias: '~/' },
		ui: { forbiddenImportPatterns: ['{alias}composition/**', '**/*.store'] },
	})
	const [restriction] = uiConfig.rules['no-restricted-imports']
	assert.equal(restriction, 'error')
	assert.deepEqual(uiConfig.rules['no-restricted-imports'][1].patterns[0].group, ['~/composition/**', '**/*.store'])
})

test('loads the shared project policy from jst.config.ts', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-policy-'))
	try {
		await writeFile(resolve(root, 'jst.config.ts'), "export default { styles: { moduleExtension: 'scss' } } as const\n")
		const policy = await loadPolicy(root)
		assert.equal(policy.styles.moduleExtension, 'scss')
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('publishes an exact top-level schema for every policy section', () => {
	assert.equal(policySchema.additionalProperties, false)
	assert.deepEqual(Object.keys(policySchema.properties).sort(), Object.keys(plugin.defaultPolicy).sort())
	for (const definition of Object.values(policySchema.$defs)) {
		if (definition.type === 'object' && definition.properties) {
			assert.equal(definition.additionalProperties, false)
		}
	}
})
