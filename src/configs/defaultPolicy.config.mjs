export const defaultPolicy = Object.freeze({
	effects: {
		constructors: ['BroadcastChannel', 'EventSource', 'WebSocket', 'Worker'],
		globals: ['caches', 'firebase', 'indexedDB', 'localStorage', 'sessionStorage', 'supabase'],
		packages: ['@apollo/client', '@firebase/', '@supabase/', 'axios', 'firebase', 'graphql-request', 'ky', 'urql', 'wretch'],
	},
	files: {
		frameworkFiles: ['src/entry.client.tsx', 'src/entry.server.tsx', 'src/root.tsx', 'src/routes.ts', 'src/vite-env.d.ts'],
		roleDirectories: {
			action: 'model',
			adapter: 'repository',
			builder: 'model',
			component: 'ui',
			dto: 'repository',
			entry: null,
			gateway: 'repository',
			injector: null,
			mapper: 'model',
			model: 'model',
			parser: 'repository',
			persister: 'repository',
			provider: null,
			repository: 'repository',
			schema: 'model',
			service: 'services',
			store: null,
			viewModel: null,
		},
		roles: ['action', 'adapter', 'builder', 'check', 'component', 'composition', 'config', 'context', 'dto', 'entry', 'factory', 'gateway', 'hook', 'injector', 'lib', 'mapper', 'model', 'page', 'parser', 'persister', 'policy', 'provider', 'repository', 'rule', 'schema', 'service', 'store', 'types', 'util', 'viewModel'],
		sliceDirectories: {
			entities: ['__tests__', 'lib', 'model', 'repository', 'services', 'ui'],
			features: ['__tests__', 'lib', 'model', 'ui'],
			widgets: ['__tests__', 'lib', 'model', 'ui'],
		},
		testSuffixes: ['test'],
	},
	imports: {
		alias: '@/',
		layers: {
			app: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
			pages: ['pages', 'widgets', 'features', 'entities', 'shared'],
			widgets: ['widgets', 'features', 'entities', 'shared'],
			features: ['features', 'entities', 'shared'],
			entities: ['entities', 'shared'],
			shared: ['shared'],
		},
		slicedLayers: ['pages', 'widgets', 'features', 'entities'],
		statePackages: ['@reatom/', '@reduxjs/', '@tanstack/react-query', 'effector', 'jotai', 'mobx', 'redux', 'zustand'],
	},
	limits: {
		complexity: 12,
		maxDepth: 3,
		maxLines: 250,
		maxLinesPerFunction: 80,
		maxParams: 4,
	},
	ui: {
		booleanVariantNames: ['compact', 'danger', 'dense', 'error', 'ghost', 'large', 'loading', 'outline', 'primary', 'secondary', 'small', 'success'],
		calculationMethods: ['reduce', 'sort', 'sortBy', 'toSorted'],
		statePackages: ['@apollo/client', '@reduxjs/', '@reatom/', '@tanstack/react-query', 'effector', 'jotai', 'mobx', 'redux', 'zustand'],
	},
})

export function createPolicy(overrides = {}) {
	return {
		effects: merge(defaultPolicy.effects, overrides.effects),
		files: {
			...merge(defaultPolicy.files, overrides.files),
			roleDirectories: merge(defaultPolicy.files.roleDirectories, overrides.files?.roleDirectories),
			sliceDirectories: merge(defaultPolicy.files.sliceDirectories, overrides.files?.sliceDirectories),
		},
		imports: {
			...merge(defaultPolicy.imports, overrides.imports),
			layers: merge(defaultPolicy.imports.layers, overrides.imports?.layers),
		},
		limits: merge(defaultPolicy.limits, overrides.limits),
		ui: merge(defaultPolicy.ui, overrides.ui),
	}
}

function merge(defaults, overrides = {}) {
	return { ...defaults, ...overrides }
}
