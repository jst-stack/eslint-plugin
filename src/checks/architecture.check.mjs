import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { findExisting } from '../lib/files.lib.mjs'

export async function checkArchitecture(root = process.cwd(), policy = defaultPolicy) {
	await assertLayerDirectories(root, policy)
	await assertDiKernel(root, policy)
}

async function assertLayerDirectories(root, policy) {
	await Promise.all(Object.keys(policy.imports.layers).map(layer => access(resolve(root, 'src', layer))))
}

async function assertDiKernel(root, policy) {
	const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	const missingDependencies = policy.architecture.requiredDependencies
		.filter(name => !packageJson.dependencies?.[name])
	if (missingDependencies.length) {
		throw new Error(`Architecture kernel requires dependencies:\n${missingDependencies.join('\n')}`)
	}
	const path = await findExisting(root, policy.architecture.containerFiles)
	const source = await readFile(path, 'utf8')
	const missingGlobs = policy.architecture.providerGlobs
		.filter(glob => !source.includes(`'${glob}'`) && !source.includes(`"${glob}"`))
	if (missingGlobs.length) {
		throw new Error(`DI composition must auto-discover provider modules:\n${missingGlobs.join('\n')}`)
	}
}
