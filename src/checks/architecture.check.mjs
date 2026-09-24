import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { findExisting, listFiles } from '../lib/files.lib.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const forbiddenUiImport = /from\s+['"][^'"]*(?:@\/app\/|\.injector|\.store|\/(?:data|repository|services)\/)[^'"]*['"]/u

export async function checkArchitecture(root = process.cwd()) {
	await assertLayerDirectories(root)
	await assertDiKernel(root)
	await assertSourceBoundaries(root)
}

async function assertLayerDirectories(root) {
	await Promise.all(layers.map(layer => access(resolve(root, 'src', layer))))
}

async function assertDiKernel(root) {
	const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	if (!packageJson.dependencies?.['@needle-di/core']) {
		throw new Error('Architecture kernel requires @needle-di/core in dependencies.')
	}
	const path = await findExisting(root, [
		'src/app/container/container.composition.ts',
		'src/app/container/container.ts',
	])
	const source = await readFile(path, 'utf8')
	if (!source.includes("'../../features/**/*.provider.ts'")) {
		throw new Error('DI composition must auto-discover src/features/**/*.provider.ts modules.')
	}
}

async function assertSourceBoundaries(root) {
	const sourceFiles = (await listFiles(resolve(root, 'src'))).filter(path => /\.[jt]sx?$/u.test(path))
	const uiImportViolations = []
	const serviceLocatorViolations = []

	for (const path of sourceFiles) {
		const source = await readFile(path, 'utf8')
		if (/\/src\/(?:widgets|features|entities)\/[^/]+\/ui\//u.test(path) && forbiddenUiImport.test(source)) {
			uiImportViolations.push(getProjectPath(path, root))
		}
		if (!/\/src\/(?:app|pages)\//u.test(path) && /\buseService\b/u.test(source)) {
			serviceLocatorViolations.push(getProjectPath(path, root))
		}
	}

	if (uiImportViolations.length) {
		throw new Error(`UI must receive state and actions through props; move orchestration out of:\n${uiImportViolations.join('\n')}`)
	}
	if (serviceLocatorViolations.length) {
		throw new Error(`useService is restricted to app/pages composition roots:\n${serviceLocatorViolations.join('\n')}`)
	}
}
