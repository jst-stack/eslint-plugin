import { dirname, normalize, posix } from 'node:path'
import { createPolicy } from '../configs/defaultPolicy.config.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

export const importContract = {
	meta: {
		docs: { description: 'Enforce exact layer direction and slice isolation.', recommended: true },
		messages: {
			layer: '{{source}} cannot depend on {{target}}. Dependencies point app → pages → widgets → features → entities → shared.',
			slice: 'Do not import directly across {{layer}} slices ({{source}} → {{target}}). Compose them in a higher layer or inject a narrow port.',
			state: 'Keep {{name}} in a store, feature entry, page, or app composition root. Models, services, repositories, and views stay state-manager agnostic.',
		},
		schema: [{ type: 'object' }],
		type: 'problem',
	},
	create(context) {
		const policy = createImportPolicy(context.options[0])
		const sourcePath = getProjectPath(context.filename)
		const source = getUnit(sourcePath, policy)
		if (!source || isTest(sourcePath)) {
			return {}
		}
		return {
			ExportAllDeclaration(node) {
				validateImport(context, node, { policy, source, sourcePath })
			},
			ExportNamedDeclaration(node) {
				validateImport(context, node, { policy, source, sourcePath })
			},
			ImportDeclaration(node) {
				validateImport(context, node, { policy, source, sourcePath })
			},
			ImportExpression(node) {
				validateImport(context, node, { policy, source, sourcePath })
			},
		}
	},
}

function validateImport(context, node, { policy, source, sourcePath }) {
	const specifier = node.source?.value
	if (typeof specifier !== 'string') {
		return
	}
	if (isStatePackage(specifier, policy) && !isStateOwner(sourcePath, source.layer)) {
		context.report({ data: { name: specifier }, messageId: 'state', node })
	}
	const targetPath = resolveSourceImport(sourcePath, specifier, policy)
	const target = getUnit(targetPath, policy)
	if (!target) {
		return
	}
	if (!policy.allowedTargets[source.layer].has(target.layer)) {
		context.report({ data: { source: source.layer, target: target.layer }, messageId: 'layer', node })
		return
	}
	if (source.layer === target.layer && policy.slicedLayers.has(source.layer) && source.slice !== target.slice) {
		context.report({
			data: { layer: source.layer, source: source.slice, target: target.slice },
			messageId: 'slice',
			node,
		})
	}
}

function isStateOwner(path, layer) {
	return ['app', 'pages'].includes(layer) || /\.(?:entry|store)\.[jt]sx?$/u.test(path)
}

function isStatePackage(name, policy) {
	return policy.statePackages.some(packageName => name === packageName || name.startsWith(packageName))
}

function resolveSourceImport(sourcePath, specifier, policy) {
	if (specifier.startsWith(policy.alias)) {
		return `src/${specifier.slice(policy.alias.length)}`
	}
	if (specifier.startsWith('.')) {
		return normalize(posix.join(dirname(sourcePath), specifier)).replaceAll('\\', '/')
	}
	return undefined
}

function getUnit(path, policy) {
	if (!path?.startsWith('src/')) {
		return undefined
	}
	const [, layer, slice] = path.split('/')
	return policy.layers.includes(layer) ? { layer, slice } : undefined
}

function createImportPolicy(overrides) {
	const imports = createPolicy({ imports: overrides }).imports
	return {
		...imports,
		allowedTargets: Object.fromEntries(Object.entries(imports.layers).map(([layer, targets]) => [layer, new Set(targets)])),
		layers: Object.keys(imports.layers),
		slicedLayers: new Set(imports.slicedLayers),
	}
}

function isTest(path) {
	return /(?:\/__tests__\/|\.(?:test|spec)\.)/u.test(path)
}
