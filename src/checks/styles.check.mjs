import { resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { DiagnosticError, diagnostic } from '../diagnostics/diagnostic.model.mjs'
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
		throw new DiagnosticError(problems)
	}
}

function getStyleProblems(file, sourceFiles, extension, globalStyles) {
	if (globalStyles.has(file)) {
		return []
	}
	if (!file.endsWith(`.module.${extension}`)) {
		return [diagnostic(
			'styles.module-name',
			`local styles must use <owner>.module.${extension}.`,
			`Rename the file to match its owning source file with the .module.${extension} suffix.`,
			file,
		)]
	}
	const owner = file.slice(0, -`.module.${extension}`.length)
	if (!sourceFiles.has(`${owner}.tsx`) && !sourceFiles.has(`${owner}.ts`)) {
		return [diagnostic(
			'styles.owner-missing',
			'expected a colocated owner with the same basename.',
			'Add the owning .ts/.tsx module or rename the stylesheet to match its owner.',
			file,
		)]
	}
	return []
}
