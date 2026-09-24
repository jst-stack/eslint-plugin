import { resolve } from 'node:path'
import process from 'node:process'
import { listFiles } from '../lib/files.lib.mjs'
import { getProjectPath } from '../lib/path.lib.mjs'

const globalStyles = new Set(['index.css', 'tailwind.css'])

export async function checkStyles(root = process.cwd()) {
	const sourceRoot = resolve(root, 'src')
	const files = (await listFiles(sourceRoot)).map(path => getProjectPath(path, sourceRoot))
	const sourceFiles = new Set(files)
	const problems = files.filter(file => file.endsWith('.css')).flatMap(file => getStyleProblems(file, sourceFiles))

	if (problems.length) {
		throw new Error(`Style file contract failed:\n${problems.join('\n')}`)
	}
}

function getStyleProblems(file, sourceFiles) {
	if (globalStyles.has(file)) {
		return []
	}
	if (!file.endsWith('.module.css')) {
		return [`${file}: local styles must use <owner>.module.css`]
	}
	const owner = file.slice(0, -'.module.css'.length)
	if (!sourceFiles.has(`${owner}.tsx`) && !sourceFiles.has(`${owner}.ts`)) {
		return [`${file}: expected a colocated owner with the same basename`]
	}
	return []
}
