import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { checkStyles } from '../src/checks/styles.check.mjs'

test('accepts the kernel and rejects UI orchestration and unowned styles', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-lint-'))
	try {
		for (const layer of ['app', 'pages', 'widgets', 'features', 'entities', 'shared']) {
			await mkdir(resolve(root, 'src', layer), { recursive: true })
		}
		await mkdir(resolve(root, 'src/app/container'), { recursive: true })
		await writeFile(resolve(root, 'package.json'), JSON.stringify({ dependencies: { '@needle-di/core': '1.0.0' } }))
		await writeFile(resolve(root, 'src/app/container/container.composition.ts'), `import.meta.glob([
			'../../entities/**/*.provider.ts',
			'../../features/**/*.provider.ts',
			'../../shared/**/*.provider.ts',
		])\n`)
		await checkArchitecture(root)
		await checkStyles(root)

		await mkdir(resolve(root, 'src/features/orders/ui'), { recursive: true })
		await writeFile(resolve(root, 'src/features/orders/ui/orders.component.tsx'), "import { store } from '../orders.store'\n")
		await assert.rejects(checkArchitecture(root), /UI must receive state and actions through props/u)

		await writeFile(resolve(root, 'src/features/orders/ui/orphan.css'), '')
		await assert.rejects(checkStyles(root), /local styles must use <owner>\.module\.css/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
