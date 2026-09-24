import { createPolicy } from '../configs/defaultPolicy.config.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

export const uiContract = {
	meta: {
		docs: { description: 'Keep view modules props-driven and independent from orchestration.', recommended: true },
		messages: {
			asyncView: 'View modules render props and emit callbacks. Move async orchestration into an entry, store, view model, or service.',
			calculation: 'Move aggregation and in-place sorting out of the view into a model, selector, or view model.',
			flagProps: 'Replace boolean variant props ({{names}}) with one explicit variant prop, slots, or composition.',
			stateImport: 'Do not bind view modules to {{name}}. Observe state in the feature entry and pass plain props and callbacks.',
		},
		schema: [{ type: 'object' }],
		type: 'problem',
	},
	create(context) {
		const policy = createUiPolicy(context.options[0])
		const path = getProjectPath(context.filename)
		if (!/\/ui\/.*\.component\.[jt]sx$/u.test(path)) {
			return {}
		}
		const typedFlags = []
		return {
			ArrowFunctionExpression: node => validateFunction(context, node, policy),
			CallExpression(node) {
				if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier'
					&& policy.calculationMethods.has(node.callee.property.name)) {
					context.report({ messageId: 'calculation', node })
				}
			},
			FunctionDeclaration: node => validateFunction(context, node, policy),
			FunctionExpression: node => validateFunction(context, node, policy),
			ImportDeclaration(node) {
				const name = node.source.value
				if (typeof name === 'string' && policy.statePackages.some(packageName => name === packageName || name.startsWith(packageName))) {
					context.report({ data: { name }, messageId: 'stateImport', node })
				}
			},
			'Program:exit'() {
				if (typedFlags.length > 1) {
					context.report({ data: { names: typedFlags.map(flag => flag.name).join(', ') }, messageId: 'flagProps', node: typedFlags[0].node })
				}
			},
			'*:exit'(node) {
				if (node.type === 'TSPropertySignature' && node.key.type === 'Identifier' && policy.booleanVariantNames.has(node.key.name)
					&& node.typeAnnotation?.typeAnnotation.type === 'TSBooleanKeyword') {
					typedFlags.push({ name: node.key.name, node })
				}
			},
		}
	},
}

function validateFunction(context, node, policy) {
	if (node.async) {
		context.report({ messageId: 'asyncView', node })
	}
	const props = node.params[0]
	if (props?.type !== 'ObjectPattern') {
		return
	}
	const flags = props.properties
		.map(property => property.type === 'Property' && property.key.type === 'Identifier' ? property.key.name : undefined)
		.filter(name => policy.booleanVariantNames.has(name))
	if (flags.length > 1) {
		context.report({ data: { names: flags.join(', ') }, messageId: 'flagProps', node: props })
	}
}

function createUiPolicy(overrides) {
	const ui = createPolicy({ ui: overrides }).ui
	return {
		...ui,
		booleanVariantNames: new Set(ui.booleanVariantNames),
		calculationMethods: new Set(ui.calculationMethods),
	}
}
