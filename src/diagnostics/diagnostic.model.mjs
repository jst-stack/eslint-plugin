export class DiagnosticError extends Error {
	diagnostics

	constructor(diagnostics) {
		super(diagnostics.map(diagnostic => diagnostic.message).join('\n'))
		this.name = 'DiagnosticError'
		this.diagnostics = Object.freeze(diagnostics.map(diagnostic => Object.freeze({ ...diagnostic })))
	}
}

export function diagnostic(code, message, repair, file) {
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
