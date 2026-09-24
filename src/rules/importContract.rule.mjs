import { dirname, normalize, posix } from 'node:path'
import { getProjectPath } from '../lib/path.lib.mjs'

const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const slicedLayers = new Set(['pages', 'widgets', 'features', 'entities'])
const allowedTargets = {
	app: new Set(layers),
	pages: new Set(['pages', 'widgets', 'features', 'entities', 'shared']),
	widgets: new Set(['widgets', 'features', 'entities', 'shared']),
	features: new Set(['features', 'entities', 'shared']),
	entities: new Set(['entities', 'shared']),
	shared: new Set(['shared']),
}

export const importContract = {
	meta: {
		docs: { description: 'Enforce exact layer direction and slice isolation.', recommended: true },
		messages: {
			layer: '{{source}} cannot depend on {{target}}. Dependencies point app → pages → widgets → features → entities → shared.',
			slice: 'Do not import directly across {{layer}} slices ({{source}} → {{target}}). Compose them in a higher layer or inject a narrow port.',
		},
		schema: [],
		type: 'problem',
	},
	create(context) {
		const sourcePath = getProjectPath(context.filename)
		const source = getUnit(sourcePath)
		if (!source || isTest(sourcePath)) {
			return {}
		}
		return {
			ExportAllDeclaration(node) {
				validateImport(context, node, source, sourcePath)
			},
			ExportNamedDeclaration(node) {
				validateImport(context, node, source, sourcePath)
			},
			ImportDeclaration(node) {
				validateImport(context, node, source, sourcePath)
			},
			ImportExpression(node) {
				validateImport(context, node, source, sourcePath)
			},
		}
	},
}

function validateImport(context, node, source, sourcePath) {
	const specifier = node.source?.value
	if (typeof specifier !== 'string') {
		return
	}
	const targetPath = resolveSourceImport(sourcePath, specifier)
	const target = getUnit(targetPath)
	if (!target) {
		return
	}
	if (!allowedTargets[source.layer].has(target.layer)) {
		context.report({ data: { source: source.layer, target: target.layer }, messageId: 'layer', node })
		return
	}
	if (source.layer === target.layer && slicedLayers.has(source.layer) && source.slice !== target.slice) {
		context.report({
			data: { layer: source.layer, source: source.slice, target: target.slice },
			messageId: 'slice',
			node,
		})
	}
}

function resolveSourceImport(sourcePath, specifier) {
	if (specifier.startsWith('@/')) {
		return `src/${specifier.slice(2)}`
	}
	if (specifier.startsWith('.')) {
		return normalize(posix.join(dirname(sourcePath), specifier)).replaceAll('\\', '/')
	}
	return undefined
}

function getUnit(path) {
	if (!path?.startsWith('src/')) {
		return undefined
	}
	const [, layer, slice] = path.split('/')
	return layers.includes(layer) ? { layer, slice } : undefined
}

function isTest(path) {
	return /(?:\/__tests__\/|\.(?:test|spec)\.)/u.test(path)
}
