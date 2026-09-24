import { getProjectPath } from '../lib/path.lib.mjs'

const statePackages = [
	'@apollo/client',
	'@reduxjs/',
	'@reatom/',
	'@tanstack/react-query',
	'effector',
	'jotai',
	'mobx',
	'redux',
	'zustand',
]
const booleanVariantNames = new Set([
	'compact',
	'danger',
	'dense',
	'error',
	'ghost',
	'large',
	'loading',
	'outline',
	'primary',
	'secondary',
	'small',
	'success',
])

export const uiContract = {
	meta: {
		docs: { description: 'Keep view modules props-driven and independent from orchestration.', recommended: true },
		messages: {
			asyncView: 'View modules render props and emit callbacks. Move async orchestration into an entry, store, view model, or service.',
			calculation: 'Move aggregation and in-place sorting out of the view into a model, selector, or view model.',
			flagProps: 'Replace boolean variant props ({{names}}) with one explicit variant prop, slots, or composition.',
			stateImport: 'Do not bind view modules to {{name}}. Observe state in the feature entry and pass plain props and callbacks.',
		},
		schema: [],
		type: 'problem',
	},
	create(context) {
		const path = getProjectPath(context.filename)
		if (!/\/ui\/.*\.component\.[jt]sx$/u.test(path)) {
			return {}
		}
		const typedFlags = []
		return {
			ArrowFunctionExpression: node => validateFunction(context, node),
			CallExpression(node) {
				if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier'
					&& ['reduce', 'sort', 'sortBy', 'toSorted'].includes(node.callee.property.name)) {
					context.report({ messageId: 'calculation', node })
				}
			},
			FunctionDeclaration: node => validateFunction(context, node),
			FunctionExpression: node => validateFunction(context, node),
			ImportDeclaration(node) {
				const name = node.source.value
				if (typeof name === 'string' && statePackages.some(packageName => name === packageName || name.startsWith(packageName))) {
					context.report({ data: { name }, messageId: 'stateImport', node })
				}
			},
			'Program:exit'() {
				if (typedFlags.length > 1) {
					context.report({ data: { names: typedFlags.map(flag => flag.name).join(', ') }, messageId: 'flagProps', node: typedFlags[0].node })
				}
			},
			'*:exit'(node) {
				if (node.type === 'TSPropertySignature' && node.key.type === 'Identifier' && booleanVariantNames.has(node.key.name)
					&& node.typeAnnotation?.typeAnnotation.type === 'TSBooleanKeyword') {
					typedFlags.push({ name: node.key.name, node })
				}
			},
		}
	},
}

function validateFunction(context, node) {
	if (node.async) {
		context.report({ messageId: 'asyncView', node })
	}
	const props = node.params[0]
	if (props?.type !== 'ObjectPattern') {
		return
	}
	const flags = props.properties
		.map(property => property.type === 'Property' && property.key.type === 'Identifier' ? property.key.name : undefined)
		.filter(name => booleanVariantNames.has(name))
	if (flags.length > 1) {
		context.report({ data: { names: flags.join(', ') }, messageId: 'flagProps', node: props })
	}
}
