import { getProjectPath } from '../lib/path.mjs'

const frameworkFiles = new Set([
	'src/entry.client.tsx',
	'src/entry.server.tsx',
	'src/root.tsx',
	'src/routes.ts',
	'src/vite-env.d.ts',
])
const roles = 'action|adapter|builder|client|component|composition|config|context|dto|entry|factory|gateway|hook|injector|lib|mapper|model|page|parser|persister|policy|provider|repository|schema|service|store|types|util|viewModel'
const filePattern = new RegExp(`^[a-z][A-Za-z0-9]*\\.(?:${roles})\\.(?:ts|tsx)$`, 'u')
const testFilePattern = new RegExp(`^[a-z][A-Za-z0-9]*(?:\\.(?:${roles}))?\\.test\\.(?:ts|tsx)$`, 'u')
const sliceLayers = {
	entities: new Set(['__tests__', 'lib', 'model', 'repository', 'services', 'ui']),
	features: new Set(['__tests__', 'lib', 'model', 'ui']),
	widgets: new Set(['__tests__', 'lib', 'model', 'ui']),
}
const roleDirectory = {
	builder: 'model',
	client: 'repository',
	component: 'ui',
	dto: 'repository',
	gateway: 'repository',
	mapper: 'model',
	model: 'model',
	parser: 'repository',
	repository: 'repository',
	service: 'services',
}

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
				if (!path.startsWith('src/') || !/\.tsx?$/u.test(path)) {
					return
				}
				if (frameworkFiles.has(path) || /\/route\.tsx$/u.test(path)) {
					return
				}

				const parts = path.split('/')
				const fileName = parts.at(-1)
				if (!filePattern.test(fileName) && !testFilePattern.test(fileName)) {
					context.report({
						data: { extension: fileName.split('.').at(-1), name: fileName },
						messageId: 'fileName',
						node,
					})
				}

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
				const role = fileName.split('.').at(-2)
				const expectedDirectory = role === 'test' ? '__tests__' : roleDirectory[role]
				if (expectedDirectory && directory !== expectedDirectory) {
					context.report({
						data: { directory: expectedDirectory, role },
						messageId: 'roleDirectory',
						node,
					})
				}
			},
		}
	},
}
