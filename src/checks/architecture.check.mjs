import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { findExisting, listFiles } from '../lib/files.lib.mjs'
import { checkWorkspace } from './workspace.check.mjs'

export async function checkArchitecture(root = process.cwd(), policy = defaultPolicy) {
	await assertLayerDirectories(root, policy)
	await assertDiKernel(root, policy)
	await assertProviderScopes(root)
	await assertModulePublicApis(root, policy)
	await checkWorkspace(root, policy)
}

async function assertProviderScopes(root) {
	const files = await listFiles(resolve(root, 'src'))
	for (const path of files.filter(file => file.endsWith('.provider.ts'))) {
		const source = await readFile(path, 'utf8')
		if (!/export const scope = ['"]request['"] as const/u.test(source)) {
			throw new Error(`DI provider must declare request scope: ${path}`)
		}
	}
}

async function assertModulePublicApis(root, policy) {
	const modulesRoot = resolve(root, 'src/modules')
	const modules = await readdir(modulesRoot, { withFileTypes: true })
	for (const module of modules.filter(entry => entry.isDirectory())) {
		const publicApi = resolve(modulesRoot, module.name, `${module.name}${policy.imports.publicApiSuffix}.ts`)
		const source = await readFile(publicApi, 'utf8').catch(() => {
			throw new Error(`Bounded-context module ${module.name} must expose ${module.name}${policy.imports.publicApiSuffix}.ts.`)
		})
		const exports = source.match(/^export\s/gmu)?.length ?? 0
		if (exports > policy.limits.maxPublicApiExports) {
			throw new Error(`Bounded-context module ${module.name} exposes ${exports} public entries; limit is ${policy.limits.maxPublicApiExports}. Split its contract, not its cohesion.`)
		}
	}
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
