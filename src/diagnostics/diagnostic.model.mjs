export const diagnosticCodes = Object.freeze([
	'architecture.kernel-dependency',
	'architecture.layer-directory',
	'architecture.module-public-api',
	'architecture.module-public-api-budget',
	'architecture.provider-discovery',
	'architecture.provider-scope',
	'budgets.css-gzip',
	'budgets.javascript-gzip',
	'budgets.unexpected-chunk',
	'styles.module-name',
	'styles.owner-missing',
	'workspace.decision-headings',
	'workspace.decision-link',
	'workspace.decision-location',
	'workspace.deep-import',
	'workspace.dependency-cycle',
	'workspace.manifest-missing',
	'workspace.microfrontend-contract',
	'workspace.microfrontend-script',
	'workspace.name-missing',
	'workspace.public-entry',
	'workspace.root-registration',
	'workspace.undeclared-dependency',
	'workspace.wildcard-export',
])

const knownCodes = new Set(diagnosticCodes)

export class DiagnosticError extends Error {
	diagnostics

	constructor(diagnostics) {
		super(diagnostics.map(diagnostic => diagnostic.message).join('\n'))
		this.name = 'DiagnosticError'
		this.diagnostics = Object.freeze(diagnostics.map(diagnostic => Object.freeze({ ...diagnostic })))
	}
}

export function diagnostic(code, message, repair, file) {
	if (!knownCodes.has(code)) {
		throw new TypeError(`Unknown diagnostic code: ${code}`)
	}
	return {
		code,
		docsUrl: `https://github.com/jst-stack/eslint-plugin/blob/main/docs/cli-diagnostics.md#${code.replaceAll('.', '')}`,
		...(file ? { file } : {}),
		message,
		repair,
	}
}

export function fail(diagnosticValue) {
	throw new DiagnosticError([diagnosticValue])
}
