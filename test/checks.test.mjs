import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { checkBuildBudgets } from '../src/checks/budgets.check.mjs'
import { checkStyles } from '../src/checks/styles.check.mjs'
import { defineConfig } from '../src/index.mjs'

test('accepts the kernel and rejects unowned styles', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-lint-'))
	try {
		for (const layer of ['app', 'pages', 'modules', 'widgets', 'features', 'entities', 'shared']) {
			await mkdir(resolve(root, 'src', layer), { recursive: true })
		}
		await mkdir(resolve(root, 'src/app/container'), { recursive: true })
		await mkdir(resolve(root, 'src/shared/di'), { recursive: true })
		await writeFile(resolve(root, 'package.json'), JSON.stringify({ dependencies: { '@needle-di/core': '1.0.0' } }))
		await writeFile(resolve(root, 'src/app/container/container.composition.ts'), `import.meta.glob([
			'../../entities/**/*.provider.ts',
			'../../features/**/*.provider.ts',
			'../../modules/**/*.provider.ts',
			'../../shared/**/*.provider.ts',
		])\n`)
		await writeFile(resolve(root, 'src/shared/di/serviceLocator.context.ts'), 'export const useService = () => null\n')
		await checkArchitecture(root)
		await checkStyles(root)

		await mkdir(resolve(root, 'src/features/orders/ui'), { recursive: true })
		await writeFile(resolve(root, 'src/features/orders/ui/orphan.css'), '')
		await assert.rejects(checkStyles(root), /local styles must use <owner>\.module\.css/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('requires bounded-context public APIs and enforces their export budget', async () => {
	const root = await createArchitectureFixture()
	try {
		await mkdir(resolve(root, 'src/modules/billing'), { recursive: true })
		await assert.rejects(checkArchitecture(root), /billing\.public\.ts/u)
		await writeFile(resolve(root, 'src/modules/billing/billing.public.ts'), 'export const billing = 1\nexport const invoice = 2\n')
		await checkArchitecture(root, defineConfig({ limits: { maxPublicApiExports: 2 } }))
		await assert.rejects(
			checkArchitecture(root, defineConfig({ limits: { maxPublicApiExports: 1 } })),
			/exposes 2 public entries/u,
		)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('requires discovered providers to declare their request lifetime', async () => {
	const root = await createArchitectureFixture()
	try {
		await mkdir(resolve(root, 'src/features/orders'), { recursive: true })
		const provider = resolve(root, 'src/features/orders/orders.provider.ts')
		await writeFile(provider, 'export function provider() {}\n')
		await assert.rejects(checkArchitecture(root), /must declare request scope/u)
		await writeFile(provider, "export const scope = 'request' as const\nexport function provider() {}\n")
		await checkArchitecture(root)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('enforces workspace public entries, ADRs, declared dependencies, and acyclic packages', async () => {
	const root = await createArchitectureFixture({ workspaces: ['packages/*'] })
	try {
		await createWorkspacePackage(root, 'orders', {
			dependencies: { '@jst-internal/payments': 'workspace:*' },
			source: "import '@jst-internal/payments'\nexport const orders = true\n",
		})
		await createWorkspacePackage(root, 'payments', { source: 'export const payments = true\n' })
		await checkArchitecture(root)

		const orders = JSON.parse(await readFile(resolve(root, 'packages/orders/package.json'), 'utf8'))
		orders.dependencies = {}
		await writeFile(resolve(root, 'packages/orders/package.json'), JSON.stringify(orders))
		await assert.rejects(checkArchitecture(root), /undeclared workspace dependency/u)

		orders.dependencies = { '@jst-internal/payments': 'workspace:*' }
		await writeFile(resolve(root, 'packages/orders/package.json'), JSON.stringify(orders))
		const payments = JSON.parse(await readFile(resolve(root, 'packages/payments/package.json'), 'utf8'))
		payments.dependencies = { '@jst-internal/orders': 'workspace:*' }
		await writeFile(resolve(root, 'packages/payments/package.json'), JSON.stringify(payments))
		await assert.rejects(checkArchitecture(root), /Workspace package cycle/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('rejects deep package exports and incomplete microfrontend operations contracts', async () => {
	const root = await createArchitectureFixture({ workspaces: ['packages/*'] })
	try {
		await createWorkspacePackage(root, 'billing', { source: 'export const billing = true\n' })
		const path = resolve(root, 'packages/billing/package.json')
		const manifest = JSON.parse(await readFile(path, 'utf8'))
		manifest.exports['./*'] = './src/*'
		await writeFile(path, JSON.stringify(manifest))
		await assert.rejects(checkArchitecture(root), /must not expose wildcard deep imports/u)

		delete manifest.exports['./*']
		manifest.jst.kind = 'microfrontend'
		manifest.scripts = { build: 'vite build' }
		await writeFile(path, JSON.stringify(manifest))
		await assert.rejects(checkArchitecture(root), /must declare jst\.fallback/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

async function createArchitectureFixture(extraManifest = {}) {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-architecture-'))
	for (const layer of ['app', 'pages', 'modules', 'widgets', 'features', 'entities', 'shared']) {
		await mkdir(resolve(root, 'src', layer), { recursive: true })
	}
	await mkdir(resolve(root, 'src/app/container'), { recursive: true })
	await writeFile(resolve(root, 'package.json'), JSON.stringify({ dependencies: { '@needle-di/core': '1.0.0' }, ...extraManifest }))
	await writeFile(resolve(root, 'src/app/container/container.composition.ts'), `import.meta.glob([
		'../../entities/**/*.provider.ts',
		'../../features/**/*.provider.ts',
		'../../modules/**/*.provider.ts',
		'../../shared/**/*.provider.ts',
	])\n`)
	return root
}

async function createWorkspacePackage(root, name, { dependencies = {}, source }) {
	const path = resolve(root, 'packages', name)
	const decision = resolve(root, 'docs/decisions', `0001-extract-${name}.md`)
	await mkdir(resolve(path, 'src'), { recursive: true })
	await mkdir(resolve(root, 'docs/decisions'), { recursive: true })
	await writeFile(decision, '# Decision\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Revisit when\n\n## Rollback\n')
	await writeFile(resolve(path, 'package.json'), JSON.stringify({
		dependencies,
		exports: { '.': './src/index.ts' },
		jst: { architectureDecision: `../../docs/decisions/0001-extract-${name}.md`, kind: 'bounded-context' },
		name: `@jst-internal/${name}`,
	}))
	await writeFile(resolve(path, 'src/index.ts'), source)
}

test('uses the configured style module extension', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-styles-'))
	try {
		await mkdir(resolve(root, 'src/features/orders/ui'), { recursive: true })
		await writeFile(resolve(root, 'src/features/orders/ui/orders.component.tsx'), 'export const Orders = () => null\n')
		await writeFile(resolve(root, 'src/features/orders/ui/orders.component.module.scss'), '')
		await checkStyles(root, defineConfig({ styles: { moduleExtension: 'scss' } }))
		await assert.rejects(checkStyles(root), /module\.css/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('enforces gzip and unexpected-chunk budgets from policy', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-budgets-'))
	try {
		await mkdir(resolve(root, 'build/client/assets'), { recursive: true })
		await writeFile(resolve(root, 'build/client/assets/app.js'), 'export const value = 1\n')
		await writeFile(resolve(root, 'build/client/assets/app.css'), '.root { display: block }\n')
		await checkBuildBudgets(root, defineConfig({ performance: { budgets: { gzipCssBytes: 1_000, gzipJavaScriptBytes: 1_000 } } }))
		await assert.rejects(
			checkBuildBudgets(root, defineConfig({ performance: { budgets: { gzipJavaScriptBytes: 1 } } })),
			/JavaScript gzip budget exceeded/u,
		)
		await assert.rejects(
			checkBuildBudgets(root, defineConfig({ performance: { budgets: { unexpectedChunks: ['app.js'] } } })),
			/Unexpected build chunks/u,
		)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
