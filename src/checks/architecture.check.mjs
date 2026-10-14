import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { diagnostic, fail } from '../diagnostics/diagnostic.model.mjs'
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
			fail(diagnostic(
				'architecture.provider-scope',
				'DI provider must declare request scope.',
				"Export `scope = 'request' as const` from the provider module.",
				path,
			))
		}
	}
}

async function assertModulePublicApis(root, policy) {
	const modulesRoot = resolve(root, 'src/modules')
	const modules = await readdir(modulesRoot, { withFileTypes: true })
	for (const module of modules.filter(entry => entry.isDirectory())) {
		const publicApi = resolve(modulesRoot, module.name, `${module.name}${policy.imports.publicApiSuffix}.ts`)
		const source = await readFile(publicApi, 'utf8').catch(() => {
			fail(diagnostic(
				'architecture.module-public-api',
				`Bounded-context module ${module.name} must expose ${module.name}${policy.imports.publicApiSuffix}.ts.`,
				'Add the module public API and export only its supported external contract.',
				publicApi,
			))
		})
		const exports = source.match(/^export\s/gmu)?.length ?? 0
		if (exports > policy.limits.maxPublicApiExports) {
			fail(diagnostic(
				'architecture.module-public-api-budget',
				`Bounded-context module ${module.name} exposes ${exports} public entries; limit is ${policy.limits.maxPublicApiExports}.`,
				'Shrink or split the public contract without splitting cohesive implementation details.',
				publicApi,
			))
		}
	}
}

async function assertLayerDirectories(root, policy) {
	await Promise.all(Object.keys(policy.imports.layers).map(async (layer) => {
		const path = resolve(root, 'src', layer)
		await access(path).catch(() => fail(diagnostic(
			'architecture.layer-directory',
			`Required architecture layer is missing: ${layer}.`,
			`Create src/${layer} and keep the configured layer contract intact.`,
			path,
		)))
	}))
}

async function assertDiKernel(root, policy) {
	const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	const missingDependencies = policy.architecture.requiredDependencies
		.filter(name => !packageJson.dependencies?.[name])
	if (missingDependencies.length) {
		fail(diagnostic(
			'architecture.kernel-dependency',
			`Architecture kernel requires dependencies: ${missingDependencies.join(', ')}.`,
			'Install the missing runtime dependencies and commit the updated lockfile.',
			'package.json',
		))
	}
	const path = await findExisting(root, policy.architecture.containerFiles)
	const source = await readFile(path, 'utf8')
	const missingGlobs = policy.architecture.providerGlobs
		.filter(glob => !source.includes(`'${glob}'`) && !source.includes(`"${glob}"`))
	if (missingGlobs.length) {
		fail(diagnostic(
			'architecture.provider-discovery',
			`DI composition must auto-discover provider modules: ${missingGlobs.join(', ')}.`,
			'Add the configured provider globs to the application composition root.',
			path,
		))
	}
}
