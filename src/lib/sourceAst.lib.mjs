import { parse } from '@typescript-eslint/parser'

export function parseModule(source, path) {
	return parse(source, {
		comment: false,
		errorOnUnknownASTType: false,
		filePath: path,
		jsx: path.endsWith('x'),
		sourceType: 'module',
	})
}

export function collectModuleSpecifiers(program) {
	const specifiers = program.body.flatMap((node) => {
		if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') {
			return typeof node.source?.value === 'string' ? [node.source.value] : []
		}
		return []
	})
	visit(program, (node) => {
		if (node.type === 'ImportExpression' && node.source.type === 'Literal' && typeof node.source.value === 'string') {
			specifiers.push(node.source.value)
		}
	})
	return specifiers
}

export function countPublicExports(program) {
	return program.body.reduce((count, node) => {
		if (node.type === 'ExportAllDeclaration' || node.type === 'ExportDefaultDeclaration') {
			return count + 1
		}
		if (node.type !== 'ExportNamedDeclaration') {
			return count
		}
		if (node.specifiers.length) {
			return count + node.specifiers.length
		}
		if (node.declaration?.type === 'VariableDeclaration') {
			return count + node.declaration.declarations.length
		}
		return count + (node.declaration ? 1 : 0)
	}, 0)
}

export function exportedRequestScope(program) {
	return program.body.some((node) => {
		if (node.type !== 'ExportNamedDeclaration' || node.declaration?.type !== 'VariableDeclaration') {
			return false
		}
		return node.declaration.kind === 'const' && node.declaration.declarations.some((declaration) => {
			let value = declaration.init
			while (value?.type === 'TSAsExpression') {
				value = value.expression
			}
			return declaration.id.type === 'Identifier' && declaration.id.name === 'scope'
				&& value?.type === 'Literal' && value.value === 'request'
		})
	})
}

export function collectStringLiterals(program) {
	const values = new Set()
	visit(program, (node) => {
		if (node.type === 'Literal' && typeof node.value === 'string') {
			values.add(node.value)
		}
	})
	return values
}

function visit(value, callback) {
	if (!value || typeof value !== 'object') {
		return
	}
	if (typeof value.type === 'string') {
		callback(value)
	}
	for (const child of Object.values(value)) {
		if (child !== value && (Array.isArray(child) || (child && typeof child === 'object'))) {
			if (Array.isArray(child)) {
				child.forEach(item => visit(item, callback))
			}
			else {
				visit(child, callback)
			}
		}
	}
}
