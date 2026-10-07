const defaults = {
	architecture: {
		containerFiles: ['src/app/container/container.composition.ts', 'src/app/container/container.ts'],
		decisionDirectory: 'docs/decisions',
		packageRoots: ['packages'],
		providerGlobs: ['../../entities/**/*.provider.ts', '../../features/**/*.provider.ts', '../../modules/**/*.provider.ts', '../../shared/**/*.provider.ts'],
		requiredDecisionHeadings: ['Context', 'Decision', 'Consequences', 'Revisit when', 'Rollback'],
		requiredDependencies: ['@needle-di/core'],
		serviceLocatorOwners: ['app', 'pages'],
	},
	effects: {
		constructors: ['BroadcastChannel', 'EventSource', 'WebSocket', 'Worker'],
		globals: ['caches', 'firebase', 'indexedDB', 'localStorage', 'sessionStorage', 'supabase'],
		packages: ['@apollo/client', '@firebase/', '@supabase/', 'axios', 'firebase', 'graphql-request', 'ky', 'urql', 'wretch'],
	},
	exceptions: [],
	files: {
		frameworkFiles: ['src/entry.client.tsx', 'src/entry.server.tsx', 'src/root.tsx', 'src/routes.ts', 'src/vite-env.d.ts'],
		roleDirectories: {
			action: 'model', adapter: 'repository', builder: 'model', component: 'ui', dto: 'repository',
			entry: null, gateway: 'repository', injector: null, mapper: 'model', model: 'model',
			handler: 'repository', parser: 'repository', persister: 'repository', provider: null, public: null, repository: 'repository',
			schema: 'model', service: 'services', store: null, viewModel: null,
		},
		roles: ['action', 'adapter', 'builder', 'check', 'component', 'composition', 'config', 'context', 'dto', 'entry', 'factory', 'gateway', 'handler', 'hook', 'injector', 'lib', 'mapper', 'model', 'page', 'parser', 'persister', 'policy', 'provider', 'public', 'repository', 'rule', 'schema', 'service', 'store', 'types', 'util', 'viewModel'],
		sliceDirectories: {
			entities: ['__tests__', 'lib', 'model', 'repository', 'services', 'ui'],
			features: ['__tests__', 'lib', 'model', 'ui'],
			modules: ['__tests__', 'lib', 'model', 'pages', 'repository', 'services', 'ui'],
			widgets: ['__tests__', 'lib', 'model', 'ui'],
		},
		testSuffixes: ['test'],
	},
	generator: {
		layers: { entity: 'entities', feature: 'features', module: 'modules', widget: 'widgets' },
		testDirectory: '__tests__',
	},
	imports: {
		alias: '@/',
		layers: {
			app: ['app', 'pages', 'modules', 'widgets', 'features', 'entities', 'shared'],
			pages: ['pages', 'modules', 'widgets', 'features', 'entities', 'shared'],
			modules: ['modules', 'widgets', 'features', 'entities', 'shared'],
			widgets: ['widgets', 'features', 'entities', 'shared'],
			features: ['features', 'entities', 'shared'],
			entities: ['entities', 'shared'],
			shared: ['shared'],
		},
		slicedLayers: ['pages', 'modules', 'widgets', 'features', 'entities'],
		publicApiSuffix: '.public',
		statePackages: ['@reatom/', '@reduxjs/', '@tanstack/react-query', 'effector', 'jotai', 'mobx', 'redux', 'zustand'],
	},
	limits: { complexity: 12, maxDepth: 3, maxLines: 250, maxLinesPerFunction: 80, maxParams: 4, maxPublicApiExports: 30 },
	performance: {
		budgets: { gzipCssBytes: 50_000, gzipJavaScriptBytes: 250_000, unexpectedChunks: [] },
	},
	styles: { globalFiles: ['index.css'], moduleExtension: 'css' },
	ui: {
		booleanVariantNames: ['compact', 'danger', 'dense', 'error', 'ghost', 'large', 'loading', 'outline', 'primary', 'secondary', 'small', 'success'],
		calculationMethods: ['reduce', 'sort', 'sortBy', 'toSorted'],
		forbiddenImportPatterns: ['{alias}app/**', '**/*.injector', '**/*.store', '**/data/**', '**/repository/**', '**/services/**'],
		statePackages: ['@apollo/client', '@reduxjs/', '@reatom/', '@tanstack/react-query', 'effector', 'jotai', 'mobx', 'redux', 'zustand'],
	},
}

const recordPaths = new Set(['files.roleDirectories', 'files.sliceDirectories', 'generator.layers', 'imports.layers'])

export function normalizePolicy(overrides) {
	assertPlainObject(overrides, 'policy')
	validateOverrides(overrides, defaults)
	const policy = merge(defaults, overrides)
	validatePolicy(policy)
	return deepFreeze(policy)
}

function validateOverrides(value, shape, path = '') {
	for (const [key, entry] of Object.entries(value)) {
		const entryPath = path ? `${path}.${key}` : key
		if (!(key in shape) && !recordPaths.has(path)) {
			throw new TypeError(`Unknown JST policy key: ${entryPath}`)
		}
		if (!(key in shape)) {
			validateRecordEntry(entry, path, entryPath)
			continue
		}
		validateValue(entry, shape[key], entryPath)
	}
}

function validateRecordEntry(value, recordPath, path) {
	if (recordPath === 'files.roleDirectories' || recordPath === 'generator.layers') {
		if (value !== null && typeof value !== 'string') {
			throw new TypeError(`${path} must be a string or null.`)
		}
		return
	}
	if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
		throw new TypeError(`${path} must be an array of strings.`)
	}
}

function validatePolicy(policy) {
	validatePositiveIntegers(policy.limits, 'limits')
	const { unexpectedChunks, ...sizeBudgets } = policy.performance.budgets
	validatePositiveIntegers(sizeBudgets, 'performance.budgets')
	if (!Array.isArray(unexpectedChunks) || unexpectedChunks.some(value => typeof value !== 'string')) {
		throw new TypeError('performance.budgets.unexpectedChunks must be an array of strings.')
	}
	if (!['css', 'scss'].includes(policy.styles.moduleExtension)) {
		throw new TypeError('styles.moduleExtension must be css or scss.')
	}
	validateExceptionExpiry(policy.exceptions)
	const layers = new Set(Object.keys(policy.imports.layers))
	for (const layer of Object.values(policy.generator.layers)) {
		if (!layers.has(layer)) {
			throw new TypeError(`generator.layers contains unknown layer: ${layer}`)
		}
	}
	for (const layer of policy.imports.slicedLayers) {
		if (!layers.has(layer)) {
			throw new TypeError(`imports.slicedLayers contains unknown layer: ${layer}`)
		}
	}
	for (const [source, targets] of Object.entries(policy.imports.layers)) {
		for (const target of targets) {
			if (!layers.has(target)) {
				throw new TypeError(`imports.layers.${source} contains unknown layer: ${target}`)
			}
		}
	}
}

function validatePositiveIntegers(values, path) {
	for (const [name, value] of Object.entries(values)) {
		if (!Number.isInteger(value) || value < 1) {
			throw new TypeError(`${path}.${name} must be a positive integer.`)
		}
	}
}

function validateExceptionExpiry(exceptions) {
	const today = new Date().toISOString().slice(0, 10)
	for (const exception of exceptions) {
		if (exception.expires && exception.expires < today) {
			throw new TypeError(`JST policy exception expired on ${exception.expires}: ${exception.reason}`)
		}
	}
}

function validateValue(value, expected, path) {
	if (Array.isArray(expected)) {
		if (path === 'exceptions') {
			validateExceptions(value)
			return
		}
		if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
			throw new TypeError(`${path} must be an array of strings.`)
		}
		return
	}
	if (isPlainObject(expected)) {
		assertPlainObject(value, path)
		validateOverrides(value, expected, path)
		return
	}
	if (expected === null) {
		if (value !== null && typeof value !== 'string') {
			throw new TypeError(`${path} must be a string or null.`)
		}
		return
	}
	if (typeof value !== typeof expected) {
		throw new TypeError(`${path} must be ${typeof expected}.`)
	}
}

function validateExceptions(value) {
	if (!Array.isArray(value)) {
		throw new TypeError('exceptions must be an array.')
	}
	const allowedKeys = new Set(['expires', 'files', 'owner', 'reason', 'rules'])
	for (const [index, exception] of value.entries()) {
		assertPlainObject(exception, `exceptions.${index}`)
		for (const key of Object.keys(exception)) {
			if (!allowedKeys.has(key)) {
				throw new TypeError(`Unknown JST policy key: exceptions.${index}.${key}`)
			}
		}
		validateStringArray(exception.files, `exceptions.${index}.files`)
		validateStringArray(exception.rules, `exceptions.${index}.rules`)
		if (typeof exception.reason !== 'string' || !exception.reason.trim()) {
			throw new TypeError(`exceptions.${index}.reason is required.`)
		}
		if (exception.owner !== undefined && typeof exception.owner !== 'string') {
			throw new TypeError(`exceptions.${index}.owner must be a string.`)
		}
		if (exception.expires !== undefined && !/^\d{4}-\d{2}-\d{2}$/u.test(exception.expires)) {
			throw new TypeError(`exceptions.${index}.expires must use YYYY-MM-DD.`)
		}
	}
}

function validateStringArray(value, path) {
	if (!Array.isArray(value) || !value.length || value.some(item => typeof item !== 'string')) {
		throw new TypeError(`${path} must be a non-empty array of strings.`)
	}
}

function merge(base, overrides, path = '') {
	const result = { ...base }
	for (const [key, value] of Object.entries(overrides)) {
		const entryPath = path ? `${path}.${key}` : key
		if (isPlainObject(value) && isPlainObject(base[key])) {
			result[key] = recordPaths.has(entryPath) ? { ...base[key], ...value } : merge(base[key], value, entryPath)
		}
		else {
			result[key] = value
		}
	}
	return result
}

function deepFreeze(value) {
	for (const entry of Object.values(value)) {
		if (entry && typeof entry === 'object') {
			deepFreeze(entry)
		}
	}
	return Object.freeze(value)
}

function assertPlainObject(value, path) {
	if (!isPlainObject(value)) {
		throw new TypeError(`${path} must be an object.`)
	}
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}
