import { createPolicy } from '../configs/defaultPolicy.config.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

export const effectsAtBoundary = {
	meta: {
		docs: { description: 'Keep browser and network effects behind adapters.', recommended: true },
		messages: {
			effect: 'Move {{effect}} access behind an entity repository or shared infrastructure adapter and inject its narrow port.',
		},
		schema: [{ type: 'object' }],
		type: 'problem',
	},
	create(context) {
		const policy = createEffectPolicy(context.options[0])
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
				reportEffectPackage(node, node.source?.value, report, policy)
			},
			ImportDeclaration(node) {
				reportEffectPackage(node, node.source.value, report, policy)
			},
			MemberExpression(node) {
				if (node.object.type === 'Identifier' && policy.globals.has(node.object.name)) {
					report(node, node.object.name)
				}
				if (node.object.type === 'Identifier' && ['globalThis', 'window'].includes(node.object.name)
					&& node.property.type === 'Identifier' && policy.globals.has(node.property.name)) {
					report(node, node.property.name)
				}
				if (isMember(node, 'document', 'cookie')) {
					report(node, 'document.cookie')
				}
			},
			NewExpression(node) {
				if (node.callee.type === 'Identifier' && policy.constructors.has(node.callee.name)) {
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

function reportEffectPackage(node, name, report, policy) {
	if (typeof name === 'string' && policy.packages.some(packageName => name === packageName || name.startsWith(packageName))) {
		report(node, name)
	}
}

function createEffectPolicy(overrides) {
	const effects = createPolicy({ effects: overrides }).effects
	return {
		...effects,
		constructors: new Set(effects.constructors),
		globals: new Set(effects.globals),
	}
}
