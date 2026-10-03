#!/usr/bin/env node
import console from 'node:console'
import process from 'node:process'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { checkBuildBudgets } from '../src/checks/budgets.check.mjs'
import { checkStyles } from '../src/checks/styles.check.mjs'
import { loadPolicy } from '../src/configs/loadPolicy.config.mjs'

const checks = {
	architecture: checkArchitecture,
	budgets: checkBuildBudgets,
	styles: checkStyles,
}
const [name] = process.argv.slice(2)

try {
	if (!checks[name]) {
		throw new Error('Usage: jst-lint <architecture|budgets|styles>')
	}
	const policy = await loadPolicy(process.cwd())
	await checks[name](process.cwd(), policy)
}
catch (error) {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
}
