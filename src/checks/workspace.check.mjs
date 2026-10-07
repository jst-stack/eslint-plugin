import { access, readFile, readdir } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

const sourcePattern = /\.(?:js|jsx|mjs|ts|tsx)$/u
const importPattern = /(?:from\s*|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/gu

export async function checkWorkspace(root, policy) {
	const packages = await findPackages(root, policy.architecture.packageRoots)
	if (!packages.length) {
		return
	}
	const rootManifest = await readJson(resolve(root, 'package.json'))
	assertWorkspaceConfigured(rootManifest, policy.architecture.packageRoots)
	const manifests = await Promise.all(packages.map(path => readPackage(path)))
	const packageNames = new Set(manifests.map(manifest => manifest.name))
	await Promise.all(manifests.map(manifest => validatePackage(root, manifest, packageNames, policy)))
	assertAcyclic(manifests)
}

async function findPackages(root, packageRoots) {
	const packages = []
	for (const packageRoot of packageRoots) {
		const directory = resolve(root, packageRoot)
		if (!await exists(directory)) {
			continue
		}
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				packages.push(resolve(directory, entry.name))
			}
		}
	}
	return packages
}

async function readPackage(path) {
	const manifestPath = resolve(path, 'package.json')
	if (!await exists(manifestPath)) {
		throw new Error(`Workspace package is missing package.json: ${path}`)
	}
	return { ...await readJson(manifestPath), path }
}

async function validatePackage(root, manifest, packageNames, policy) {
	if (typeof manifest.name !== 'string' || !manifest.name) {
		throw new Error(`Workspace package must declare a name: ${manifest.path}`)
	}
	if (!hasPublicEntry(manifest.exports)) {
		throw new Error(`${manifest.name} must expose one explicit "." public entry through package.json exports.`)
	}
	if (Object.keys(manifest.exports).some(key => key.includes('*'))) {
		throw new Error(`${manifest.name} must not expose wildcard deep imports.`)
	}
	await validateDecision(root, manifest, policy)
	await validateImports(manifest, packageNames)
	validateDeployableContract(manifest)
}

function hasPublicEntry(exports) {
	return typeof exports === 'string' || Boolean(exports?.['.'])
}

async function validateDecision(root, manifest, policy) {
	const decision = manifest.jst?.architectureDecision
	if (typeof decision !== 'string' || !decision) {
		throw new Error(`${manifest.name} must link jst.architectureDecision to its extraction ADR.`)
	}
	const decisionPath = resolve(manifest.path, decision)
	const decisionRoot = resolve(root, policy.architecture.decisionDirectory)
	if (!isWithin(decisionRoot, decisionPath)) {
		throw new Error(`${manifest.name} architecture decision must live under ${policy.architecture.decisionDirectory}.`)
	}
	const source = await readFile(decisionPath, 'utf8')
	const missing = policy.architecture.requiredDecisionHeadings
		.filter(heading => !new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, 'mu').test(source))
	if (missing.length) {
		throw new Error(`${manifest.name} architecture decision is missing headings: ${missing.join(', ')}`)
	}
}

async function validateImports(manifest, packageNames) {
	const files = await listSourceFiles(resolve(manifest.path, 'src'))
	const declared = new Set([
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.peerDependencies ?? {}),
	])
	for (const file of files) {
		const source = await readFile(file, 'utf8')
		for (const specifier of source.matchAll(importPattern)) {
			const name = packageName(specifier[1])
			if (specifier[1].includes('/src/')) {
				throw new Error(`${manifest.name} deep-imports package source from ${specifier[1]}. Import its public entry.`)
			}
			if (packageNames.has(name) && !declared.has(name)) {
				throw new Error(`${manifest.name} imports undeclared workspace dependency ${name}.`)
			}
		}
	}
}

function validateDeployableContract(manifest) {
	if (manifest.jst?.kind !== 'microfrontend') {
		return
	}
	for (const field of ['fallback', 'hostContract', 'owner']) {
		if (typeof manifest.jst[field] !== 'string' || !manifest.jst[field]) {
			throw new Error(`${manifest.name} microfrontend must declare jst.${field}.`)
		}
	}
	for (const script of ['build', 'test']) {
		if (typeof manifest.scripts?.[script] !== 'string') {
			throw new Error(`${manifest.name} microfrontend must have an independent ${script} script.`)
		}
	}
}

function assertWorkspaceConfigured(manifest, packageRoots) {
	const workspaces = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces?.packages
	const expected = packageRoots.map(root => `${root}/*`)
	if (!Array.isArray(workspaces) || expected.some(pattern => !workspaces.includes(pattern))) {
		throw new Error(`Root package.json workspaces must include: ${expected.join(', ')}`)
	}
}

function assertAcyclic(manifests) {
	const names = new Set(manifests.map(manifest => manifest.name))
	const edges = new Map(manifests.map(manifest => [manifest.name, Object.keys(manifest.dependencies ?? {}).filter(name => names.has(name))]))
	const active = new Set()
	const visited = new Set()
	for (const name of names) {
		visit(name, { active, edges, visited }, [])
	}
}

function visit(name, graph, path) {
	if (graph.active.has(name)) {
		throw new Error(`Workspace package cycle: ${[...path, name].join(' -> ')}`)
	}
	if (graph.visited.has(name)) {
		return
	}
	graph.active.add(name)
	for (const target of graph.edges.get(name) ?? []) {
		visit(target, graph, [...path, name])
	}
	graph.active.delete(name)
	graph.visited.add(name)
}

async function listSourceFiles(directory) {
	if (!await exists(directory)) {
		return []
	}
	const files = []
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = resolve(directory, entry.name)
		if (entry.isDirectory()) {
			files.push(...await listSourceFiles(path))
		}
		else if (sourcePattern.test(entry.name)) {
			files.push(path)
		}
	}
	return files
}

function packageName(specifier) {
	return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
}

function isWithin(parent, child) {
	const path = relative(parent, child)
	return path === '' || (!path.startsWith('..') && !path.startsWith('/'))
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

async function exists(path) {
	return access(path).then(() => true, () => false)
}

async function readJson(path) {
	return JSON.parse(await readFile(path, 'utf8'))
}
