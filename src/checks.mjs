import { access, readdir, readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import process from 'node:process'

const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']

export async function checkArchitecture(root = process.cwd()) {
	await Promise.all(layers.map(layer => access(resolve(root, 'src', layer))))
	const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
	if (!packageJson.dependencies?.['@needle-di/core']) {
		throw new Error('Architecture kernel requires @needle-di/core in dependencies.')
	}

	const containerPath = await findExisting(root, [
		'src/app/container/container.composition.ts',
		'src/app/container/container.ts',
	])
	const containerSource = await readFile(containerPath, 'utf8')
	if (!containerSource.includes("'../../features/**/*.provider.ts'")) {
		throw new Error('DI composition must auto-discover src/features/**/*.provider.ts modules.')
	}

	const sourceFiles = (await listFiles(resolve(root, 'src'))).filter(path => /\.[jt]sx?$/u.test(path))
	const uiImportViolations = []
	const serviceLocatorViolations = []
	const forbiddenImport = /from\s+['"][^'"]*(?:@\/app\/|\.injector|\.store|\/(?:data|repository|services)\/)[^'"]*['"]/u

	for (const path of sourceFiles) {
		const source = await readFile(path, 'utf8')
		if (/\/src\/(?:widgets|features|entities)\/[^/]+\/ui\//u.test(path) && forbiddenImport.test(source)) {
			uiImportViolations.push(projectPath(root, path))
		}
		if (!/\/src\/(?:app|pages)\//u.test(path) && /\buseService\b/u.test(source)) {
			serviceLocatorViolations.push(projectPath(root, path))
		}
	}

	if (uiImportViolations.length) {
		throw new Error(`UI must receive state and actions through props; move orchestration out of:\n${uiImportViolations.join('\n')}`)
	}
	if (serviceLocatorViolations.length) {
		throw new Error(`useService is restricted to app/pages composition roots:\n${serviceLocatorViolations.join('\n')}`)
	}
}

export async function checkStyles(root = process.cwd()) {
	const sourceRoot = resolve(root, 'src')
	const files = await listFiles(sourceRoot)
	const relativeFiles = files.map(path => projectPath(sourceRoot, path))
	const sourceFiles = new Set(relativeFiles)
	const styleFiles = relativeFiles.filter(file => file.endsWith('.css'))
	const globals = new Set(['index.css', 'tailwind.css'])
	const problems = []

	for (const file of styleFiles) {
		if (!globals.has(file) && !file.endsWith('.module.css')) {
			problems.push(`${file}: local styles must use <owner>.module.css`)
		}
		if (file.endsWith('.module.css')) {
			const owner = file.slice(0, -'.module.css'.length)
			if (!sourceFiles.has(`${owner}.tsx`) && !sourceFiles.has(`${owner}.ts`)) {
				problems.push(`${file}: expected a colocated owner with the same basename`)
			}
		}
	}

	if (problems.length) {
		throw new Error(`Style file contract failed:\n${problems.join('\n')}`)
	}
}

async function findExisting(root, candidates) {
	for (const candidate of candidates) {
		const path = resolve(root, candidate)
		try {
			await access(path)
			return path
		}
		catch {
			continue
		}
	}
	throw new Error(`Missing DI composition root. Expected one of:\n${candidates.join('\n')}`)
}

async function listFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true })
	const paths = await Promise.all(entries.map((entry) => {
		const path = resolve(directory, entry.name)
		return entry.isDirectory() ? listFiles(path) : [path]
	}))
	return paths.flat()
}

function projectPath(root, path) {
	return relative(root, path).split(sep).join('/')
}
