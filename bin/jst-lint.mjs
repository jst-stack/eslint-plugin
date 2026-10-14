#!/usr/bin/env node
import console from 'node:console'
import process from 'node:process'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { checkBuildBudgets } from '../src/checks/budgets.check.mjs'
import { checkStyles } from '../src/checks/styles.check.mjs'
import { loadPolicy } from '../src/configs/loadPolicy.config.mjs'
import { DiagnosticError } from '../src/diagnostics/diagnostic.model.mjs'
import { renderDiagnostics } from '../src/diagnostics/diagnostic.renderer.mjs'

const checks = {
	architecture: checkArchitecture,
	budgets: checkBuildBudgets,
	styles: checkStyles,
}
const [name, ...options] = process.argv.slice(2)

const formatOption = options.find(option => option.startsWith('--format='))?.slice('--format='.length)
	?? (options.includes('--format') ? options[options.indexOf('--format') + 1] : 'pretty')

try {
	if (!checks[name] || !['pretty', 'json'].includes(formatOption)) {
		throw new Error('Usage: jst-lint <architecture|budgets|styles> [--format <pretty|json>]')
	}
	const policy = await loadPolicy(process.cwd())
	await checks[name](process.cwd(), policy)
}
catch (error) {
	if (error instanceof DiagnosticError) {
		const output = renderDiagnostics(error.diagnostics, formatOption)
		if (formatOption === 'json') {
			console.log(output)
		}
		else {
			console.error(output)
		}
		process.exitCode = 1
	}
	else {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 2
	}
}
