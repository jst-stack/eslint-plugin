export type StyleExtension = 'css' | 'scss'

export interface JstPolicyException {
	expires?: string
	files: readonly string[]
	owner?: string
	reason: string
	rules: readonly string[]
}

export interface JstPolicy {
	architecture: {
		containerFiles: readonly string[]
		providerGlobs: readonly string[]
		requiredDependencies: readonly string[]
		serviceLocatorOwners: readonly string[]
	}
	effects: {
		constructors: readonly string[]
		globals: readonly string[]
		packages: readonly string[]
	}
	exceptions: readonly JstPolicyException[]
	files: {
		frameworkFiles: readonly string[]
		roleDirectories: Readonly<Record<string, string | null>>
		roles: readonly string[]
		sliceDirectories: Readonly<Record<string, readonly string[]>>
		testSuffixes: readonly string[]
	}
	generator: {
		layers: Readonly<Record<string, string>>
		testDirectory: string
	}
	imports: {
		alias: string
		layers: Readonly<Record<string, readonly string[]>>
		publicApiSuffix: string
		slicedLayers: readonly string[]
		statePackages: readonly string[]
	}
	limits: {
		complexity: number
		maxDepth: number
		maxLines: number
		maxLinesPerFunction: number
		maxParams: number
	}
	performance: {
		budgets: {
			gzipCssBytes: number
			gzipJavaScriptBytes: number
			unexpectedChunks: readonly string[]
		}
	}
	styles: {
		globalFiles: readonly string[]
		moduleExtension: StyleExtension
	}
	ui: {
		booleanVariantNames: readonly string[]
		calculationMethods: readonly string[]
		forbiddenImportPatterns: readonly string[]
		statePackages: readonly string[]
	}
}

type DeepPartial<T> = {
	readonly [Key in keyof T]?: T[Key] extends readonly unknown[]
		? T[Key]
		: T[Key] extends object
			? DeepPartial<T[Key]>
			: T[Key]
}

export type JstPolicyInput = DeepPartial<JstPolicy>

export function defineConfig(policy?: JstPolicyInput): Readonly<JstPolicy>

declare const plugin: {
	configs: { recommended: readonly unknown[] }
	createConfig(policy?: JstPolicyInput): readonly unknown[]
	defaultPolicy: Readonly<JstPolicy>
	rules: Readonly<Record<string, unknown>>
}

export default plugin
