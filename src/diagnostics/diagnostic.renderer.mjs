export function renderDiagnostics(diagnostics, format = 'pretty') {
	if (format === 'json') {
		return JSON.stringify({ diagnostics }, null, 2)
	}
	return diagnostics.map(renderPretty).join('\n\n')
}

function renderPretty(diagnostic) {
	return [
		`[${diagnostic.code}] ${diagnostic.message}`,
		diagnostic.file ? `File: ${diagnostic.file}` : undefined,
		`Repair: ${diagnostic.repair}`,
		`Docs: ${diagnostic.docsUrl}`,
	].filter(Boolean).join('\n')
}
