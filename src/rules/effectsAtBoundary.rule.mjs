import { getProjectPath } from '../lib/path.lib.mjs'

const effectObjects = new Set(['caches', 'firebase', 'indexedDB', 'localStorage', 'sessionStorage', 'supabase'])
const effectConstructors = new Set(['BroadcastChannel', 'EventSource', 'WebSocket', 'Worker'])
const effectPackages = [
	'@apollo/client',
	'@firebase/',
	'@supabase/',
	'axios',
	'firebase',
	'graphql-request',
	'ky',
	'urql',
	'wretch',
]

export const effectsAtBoundary = {
	meta: {
		docs: { description: 'Keep browser and network effects behind adapters.', recommended: true },
		messages: {
			effect: 'Move {{effect}} access behind an entity repository or shared infrastructure adapter and inject its narrow port.',
		},
		schema: [],
		type: 'problem',
	},
	create(context) {
		const path = getProjectPath(context.filename)
		if (isEffectBoundary(path)) {
			return {}
		}
		const report = (node, effect) => context.report({ data: { effect }, messageId: 'effect', node })

		return {
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
					report(node, 'fetch')
				}
				if (isMember(node.callee, 'navigator', 'sendBeacon')) {
					report(node, 'navigator.sendBeacon')
				}
			},
			ImportExpression(node) {
				reportEffectPackage(node, node.source?.value, report)
			},
			ImportDeclaration(node) {
				reportEffectPackage(node, node.source.value, report)
			},
			MemberExpression(node) {
				if (node.object.type === 'Identifier' && effectObjects.has(node.object.name)) {
					report(node, node.object.name)
				}
				if (node.object.type === 'Identifier' && ['globalThis', 'window'].includes(node.object.name)
					&& node.property.type === 'Identifier' && effectObjects.has(node.property.name)) {
					report(node, node.property.name)
				}
				if (isMember(node, 'document', 'cookie')) {
					report(node, 'document.cookie')
				}
			},
			NewExpression(node) {
				if (node.callee.type === 'Identifier' && effectConstructors.has(node.callee.name)) {
					report(node, node.callee.name)
				}
			},
		}
	},
}

function isEffectBoundary(path) {
	return /^src\/entities\/[^/]+\/repository\//u.test(path)
		|| /^src\/shared\/.+\.(?:adapter|gateway|persister|repository)\.[jt]s$/u.test(path)
}

function isMember(node, object, property) {
	return node.type === 'MemberExpression'
		&& node.object.type === 'Identifier' && node.object.name === object
		&& node.property.type === 'Identifier' && node.property.name === property
}

function reportEffectPackage(node, name, report) {
	if (typeof name === 'string' && effectPackages.some(packageName => name === packageName || name.startsWith(packageName))) {
		report(node, name)
	}
}
