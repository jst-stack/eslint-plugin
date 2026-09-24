import { getProjectPath } from '../lib/path.lib.mjs'

const frameworkFiles = new Set([
	'src/entry.client.tsx',
	'src/entry.server.tsx',
	'src/root.tsx',
	'src/routes.ts',
	'src/vite-env.d.ts',
])
const roles = 'action|adapter|builder|check|component|composition|config|context|dto|entry|factory|gateway|hook|injector|lib|mapper|model|page|parser|persister|policy|provider|repository|rule|schema|service|store|types|util|viewModel'
const filePattern = new RegExp(`^[a-z][A-Za-z0-9]*\\.(?:${roles})\\.(?:js|mjs|ts|tsx)$`, 'u')
const testFilePattern = new RegExp(`^[a-z][A-Za-z0-9]*(?:\\.(?:${roles}))?\\.test\\.(?:js|mjs|ts|tsx)$`, 'u')
const sliceLayers = {
	entities: new Set(['__tests__', 'lib', 'model', 'repository', 'services', 'ui']),
	features: new Set(['__tests__', 'lib', 'model', 'ui']),
	widgets: new Set(['__tests__', 'lib', 'model', 'ui']),
}
const roleDirectory = new Map([
	['action', 'model'],
	['adapter', 'repository'],
	['builder', 'model'],
	['component', 'ui'],
	['dto', 'repository'],
	['entry', undefined],
	['gateway', 'repository'],
	['injector', undefined],
	['mapper', 'model'],
	['model', 'model'],
	['parser', 'repository'],
	['persister', 'repository'],
	['provider', undefined],
	['repository', 'repository'],
	['schema', 'model'],
	['service', 'services'],
	['store', undefined],
	['viewModel', undefined],
])

export const fileContract = {
	meta: {
		docs: { description: 'Enforce JST file roles and slice structure.', recommended: true },
		messages: {
			fileName: 'Rename "{{name}}" to <lowerCamelName>.<role>.{{extension}} so its responsibility is explicit.',
			roleDirectory: 'Move {{role}} files into the slice {{directory}} directory.',
			sliceDirectory: 'Place source files under {{layer}}/<slice>/...; layer roots only hold slices.',
			sliceName: 'Rename slice "{{name}}" to lowerCamelCase.',
			unknownDirectory: 'Move this file into an allowed {{layer}} slice directory: {{directories}}.',
		},
		schema: [],
		type: 'problem',
	},
	create(context) {
		return {
			Program(node) {
				const path = getProjectPath(context.filename)
				validateFile(context, node, path)
			},
		}
	},
}

function validateFile(context, node, path) {
	if (!isSourceFile(path) || frameworkFiles.has(path) || /\/route\.tsx$/u.test(path)) {
		return
	}
	const parts = path.split('/')
	validateFileName(context, node, parts.at(-1))
	validateSliceLocation(context, node, parts)
}

function isSourceFile(path) {
	return path.startsWith('src/') && /\.(?:js|mjs|ts|tsx)$/u.test(path)
}

function validateFileName(context, node, fileName) {
	if (filePattern.test(fileName) || testFilePattern.test(fileName)) {
		return
	}
	context.report({
		data: { extension: fileName.split('.').at(-1), name: fileName },
		messageId: 'fileName',
		node,
	})
}

function validateSliceLocation(context, node, parts) {
	const layer = parts[1]
	const directories = sliceLayers[layer]
	if (!directories) {
		return
	}
	if (parts.length < 4) {
		context.report({ data: { layer }, messageId: 'sliceDirectory', node })
		return
	}
	const slice = parts[2]
	if (!/^[a-z][A-Za-z0-9]*$/u.test(slice)) {
		context.report({ data: { name: slice }, messageId: 'sliceName', node })
	}
	const directory = parts.length > 4 ? parts[3] : undefined
	if (directory && !directories.has(directory)) {
		context.report({
			data: { directories: [...directories].join(', '), layer },
			messageId: 'unknownDirectory',
			node,
		})
	}
	validateRoleDirectory({ context, directory, fileName: parts.at(-1), node, parts })
}

function validateRoleDirectory({ context, directory, fileName, node, parts }) {
	const role = fileName.split('.').at(-2)
	if (role === 'test' && parts.includes('__tests__')) {
		return
	}
	const hasExpectedDirectory = role === 'test' || roleDirectory.has(role)
	const expectedDirectory = role === 'test' ? '__tests__' : roleDirectory.get(role)
	if (hasExpectedDirectory && directory !== expectedDirectory) {
		context.report({
			data: { directory: expectedDirectory ?? 'root', role },
			messageId: 'roleDirectory',
			node,
		})
	}
}
