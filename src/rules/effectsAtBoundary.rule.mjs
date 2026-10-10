import { createPolicy } from '../configs/defaultPolicy.config.mjs'
import { matchesPackage } from '../lib/packageName.lib.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

export const effectsAtBoundary = {
	meta: {
		docs: {
			description: 'Keep browser and network effects behind adapters.',
			recommended: true,
			url: 'https://github.com/jst-stack/eslint-plugin/blob/main/docs/rules/effects-at-boundary.md',
		},
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
		const isGlobal = node => isUnshadowed(context, node)

		return {
			CallExpression(node) {
				if (node.callee.type === 'Identifier' && node.callee.name === 'fetch' && isGlobal(node.callee)) {
					report(node, 'fetch')
				}
				if (isMember(node.callee, 'navigator', 'sendBeacon') && isGlobal(node.callee.object)) {
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
				if (node.object.type === 'Identifier' && policy.globals.has(node.object.name) && isGlobal(node.object)) {
					report(node, node.object.name)
				}
				if (node.object.type === 'Identifier' && ['globalThis', 'window'].includes(node.object.name) && isGlobal(node.object)
					&& node.property.type === 'Identifier' && policy.globals.has(node.property.name)) {
					report(node, node.property.name)
				}
				if (isMember(node, 'document', 'cookie') && isGlobal(node.object)) {
					report(node, 'document.cookie')
				}
			},
			NewExpression(node) {
				if (node.callee.type === 'Identifier' && policy.constructors.has(node.callee.name) && isGlobal(node.callee)) {
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
	if (typeof name === 'string' && matchesPackage(name, policy.packages)) {
		report(node, name)
	}
}

function isUnshadowed(context, node) {
	let scope = context.sourceCode.getScope(node)
	while (scope) {
		const variable = scope.set.get(node.name)
		if (variable) {
			return variable.defs.length === 0
		}
		scope = scope.upper
	}
	return true
}

function createEffectPolicy(overrides) {
	const effects = createPolicy(overrides ? { effects: overrides } : {}).effects
	return {
		...effects,
		constructors: new Set(effects.constructors),
		globals: new Set(effects.globals),
	}
}
