import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
		for (const layer of ['app', 'pages', 'widgets', 'features', 'entities', 'shared']) {
			await mkdir(resolve(root, 'src', layer), { recursive: true })
		}
		await mkdir(resolve(root, 'src/app/container'), { recursive: true })
		await mkdir(resolve(root, 'src/shared/di'), { recursive: true })
		await writeFile(resolve(root, 'package.json'), JSON.stringify({ dependencies: { '@needle-di/core': '1.0.0' } }))
		await writeFile(resolve(root, 'src/app/container/container.composition.ts'), `import.meta.glob([
			'../../entities/**/*.provider.ts',
			'../../features/**/*.provider.ts',
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
