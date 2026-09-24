import { getProjectPath } from '../lib/path.lib.mjs'

const effects = new Set(['fetch', 'indexedDB', 'localStorage', 'sessionStorage'])

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
		if (/\/repository\/|^src\/shared\/(?:api|storages)\//u.test(path)) {
			return {}
		}
		const report = (node, effect) => context.report({ data: { effect }, messageId: 'effect', node })

		return {
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
					report(node, 'fetch')
				}
			},
			MemberExpression(node) {
				if (node.object.type === 'Identifier' && effects.has(node.object.name)) {
					report(node, node.object.name)
				}
				if (node.object.type === 'Identifier' && ['globalThis', 'window'].includes(node.object.name)
					&& node.property.type === 'Identifier' && effects.has(node.property.name)) {
					report(node, node.property.name)
				}
			},
		}
	},
}
