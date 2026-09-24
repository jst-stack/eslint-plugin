#!/usr/bin/env node
import console from 'node:console'
import process from 'node:process'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { checkStyles } from '../src/checks/styles.check.mjs'

const checks = {
	architecture: checkArchitecture,
	styles: checkStyles,
}
const [name] = process.argv.slice(2)

try {
	if (!checks[name]) {
		throw new Error('Usage: jst-lint <architecture|styles>')
	}
	await checks[name]()
}
catch (error) {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
}
