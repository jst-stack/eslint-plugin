import { resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { listFiles } from '../lib/files.lib.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

export async function checkStyles(root = process.cwd(), policy = defaultPolicy) {
	const sourceRoot = resolve(root, 'src')
	const files = (await listFiles(sourceRoot)).map(path => getProjectPath(path, sourceRoot))
	const sourceFiles = new Set(files)
	const extension = policy.styles.moduleExtension
	const problems = files
		.filter(file => file.endsWith('.css') || file.endsWith('.scss'))
		.flatMap(file => getStyleProblems(file, sourceFiles, extension, new Set(policy.styles.globalFiles)))

	if (problems.length) {
		throw new Error(`Style file contract failed:\n${problems.join('\n')}`)
	}
}

function getStyleProblems(file, sourceFiles, extension, globalStyles) {
	if (globalStyles.has(file)) {
		return []
	}
	if (!file.endsWith(`.module.${extension}`)) {
		return [`${file}: local styles must use <owner>.module.${extension}`]
	}
	const owner = file.slice(0, -`.module.${extension}`.length)
	if (!sourceFiles.has(`${owner}.tsx`) && !sourceFiles.has(`${owner}.ts`)) {
		return [`${file}: expected a colocated owner with the same basename`]
	}
	return []
}
