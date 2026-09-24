import { getProjectPath } from '../lib/path.lib.mjs'
import { createPolicy } from '../configs/defaultPolicy.config.mjs'

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
		schema: [{ type: 'object' }],
		type: 'problem',
	},
	create(context) {
		const policy = createFilePolicy(context.options[0])
		return {
			Program(node) {
				const path = getProjectPath(context.filename)
				validateFile(context, node, path, policy)
			},
		}
	},
}

function validateFile(context, node, path, policy) {
	if (!isSourceFile(path) || policy.frameworkFiles.has(path) || /\/route\.tsx$/u.test(path)) {
		return
	}
	const parts = path.split('/')
	validateFileName(context, node, parts.at(-1), policy)
	validateSliceLocation(context, node, parts, policy)
}

function isSourceFile(path) {
	return path.startsWith('src/') && /\.(?:js|mjs|ts|tsx)$/u.test(path)
}

function validateFileName(context, node, fileName, policy) {
	if (policy.filePattern.test(fileName) || policy.testFilePattern.test(fileName)) {
		return
	}
	context.report({
		data: { extension: fileName.split('.').at(-1), name: fileName },
		messageId: 'fileName',
		node,
	})
}

function validateSliceLocation(context, node, parts, policy) {
	const layer = parts[1]
	const directories = policy.sliceLayers[layer]
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
	validateRoleDirectory({ context, directory, fileName: parts.at(-1), node, parts, roleDirectory: policy.roleDirectory })
}

function validateRoleDirectory({ context, directory, fileName, node, parts, roleDirectory }) {
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

function createFilePolicy(overrides) {
	const files = createPolicy({ files: overrides }).files
	const roles = files.roles.join('|')
	const testSuffixes = files.testSuffixes.join('|')
	return {
		filePattern: new RegExp(`^[a-z][A-Za-z0-9]*\\.(?:${roles})\\.(?:js|mjs|ts|tsx)$`, 'u'),
		frameworkFiles: new Set(files.frameworkFiles),
		roleDirectory: new Map(Object.entries(files.roleDirectories).map(([role, directory]) => [role, directory ?? undefined])),
		sliceLayers: Object.fromEntries(Object.entries(files.sliceDirectories).map(([layer, directories]) => [layer, new Set(directories)])),
		testFilePattern: new RegExp(`^[a-z][A-Za-z0-9]*(?:\\.(?:${roles}))?\\.(?:${testSuffixes})\\.(?:js|mjs|ts|tsx)$`, 'u'),
	}
}
