import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { Linter } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import quality from '@jst-stack/eslint-plugin-quality'
import plugin from '../../src/index.mjs'
import { diagnosticCodes } from '../../src/diagnostics/diagnostic.model.mjs'

const cliPath = fileURLToPath(new URL('../../bin/jst-lint.mjs', import.meta.url))
const jstRuleIds = Object.keys(plugin.rules).map(name => `jst/${name}`)
const qualityRuleIds = ['quality/no-flag-prop-combinations', 'quality/no-heavy-render-work']
const supportedRules = new Set([...jstRuleIds, ...qualityRuleIds])
const eslintConfig = [{
	files: ['**/*.{js,jsx,mjs,ts,tsx}'],
	languageOptions: {
		ecmaVersion: 'latest',
		parser: tsParser,
		parserOptions: { ecmaFeatures: { jsx: true } },
		sourceType: 'module',
	},
	plugins: { jst: plugin, quality },
	rules: extractRules(plugin.configs.recommended),
}]

const linter = new Linter({ configType: 'flat' })

function extractRules(recommended) {
	const rules = {}
	for (const entry of recommended) {
		for (const [name, value] of Object.entries(entry.rules ?? {})) {
			if (supportedRules.has(name)) {
				rules[name] = value
			}
		}
	}
	return rules
}

function messagesForRule(ruleId) {
	const [namespace, name] = ruleId.split('/')
	const rule = namespace === 'jst' ? plugin.rules[name] : quality.rules[name]
	return new Set(Object.keys(rule.meta.messages))
}

export function validateCorpus(entries) {
	const problems = []
	const ids = new Set()
	const codes = new Set()
	const rules = new Set()
	for (const entry of entries) {
		if (ids.has(entry.id)) {
			problems.push(`duplicate case id: ${entry.id}`)
		}
		ids.add(entry.id)
		if (entry.runner === 'cli') {
			if (codes.has(entry.expectedDiagnostic)) {
				problems.push(`duplicate diagnostic code: ${entry.expectedDiagnostic}`)
			}
			codes.add(entry.expectedDiagnostic)
			if (!diagnosticCodes.includes(entry.expectedDiagnostic)) {
				problems.push(`unregistered diagnostic code: ${entry.expectedDiagnostic}`)
			}
			if (!['architecture', 'styles', 'budgets'].includes(entry.check)) {
				problems.push(`unknown check for ${entry.id}: ${entry.check}`)
			}
		}
		else if (entry.runner === 'eslint') {
			rules.add(entry.expectedRule)
			if (!supportedRules.has(entry.expectedRule)) {
				problems.push(`unknown rule for ${entry.id}: ${entry.expectedRule}`)
			}
			else if (!messagesForRule(entry.expectedRule).has(entry.expectedMessageId)) {
				problems.push(`unknown messageId for ${entry.id}: ${entry.expectedMessageId}`)
			}
		}
		else {
			problems.push(`unknown runner for ${entry.id}: ${entry.runner}`)
		}
	}
	for (const code of diagnosticCodes) {
		if (!codes.has(code)) {
			problems.push(`diagnostic code not covered by any case: ${code}`)
		}
	}
	for (const rule of supportedRules) {
		if (!rules.has(rule)) {
			problems.push(`rule not covered by any case: ${rule}`)
		}
	}
	return problems
}

export async function runCorpus(entries) {
	const problems = validateCorpus(entries)
	if (problems.length) {
		throw new Error(`corpus is invalid:\n${problems.map(problem => `- ${problem}`).join('\n')}`)
	}
	for (const entry of entries) {
		if (entry.runner === 'eslint') {
			runEslintCase(entry)
		}
		else {
			await runCliCase(entry)
		}
	}
	return { cases: entries.length }
}

function runEslintCase(entry) {
	const failure = lintSources(entry.invalid.files).find(message => message.severity === 2
		&& message.ruleId === entry.expectedRule
		&& message.messageId === entry.expectedMessageId)
	if (!failure) {
		throw new Error(`case ${entry.id}: expected ${entry.expectedRule}/${entry.expectedMessageId}; got ${describe(lintSources(entry.invalid.files))}`)
	}
	const repaired = lintSources(entry.repaired.files).filter(message => message.severity === 2)
	if (repaired.length) {
		throw new Error(`case ${entry.id}: repaired source still violates ${describe(repaired)}`)
	}
}

function lintSources(files) {
	return Object.entries(files).flatMap(([filename, source]) => linter.verify(source, eslintConfig, { filename }))
}

async function runCliCase(entry) {
	const invalidRoot = await writeProject(entry.invalid.files)
	try {
		const failure = runCli(entry.check, invalidRoot)
		if (failure.status !== 1) {
			throw new Error(`case ${entry.id}: expected exit 1, got ${failure.status}\n${failure.stdout}${failure.stderr}`)
		}
		const { diagnostics } = JSON.parse(failure.stdout)
		const hit = diagnostics.find(item => item.code === entry.expectedDiagnostic)
		if (!hit) {
			throw new Error(`case ${entry.id}: expected ${entry.expectedDiagnostic}; got ${diagnostics.map(item => item.code).join(', ') || 'none'}`)
		}
		const fragment = entry.expectedDiagnostic.replaceAll('.', '')
		if (!hit.docsUrl.endsWith(`#${fragment}`)) {
			throw new Error(`case ${entry.id}: unexpected docsUrl ${hit.docsUrl}`)
		}
		if (typeof hit.repair !== 'string' || !hit.repair.length) {
			throw new Error(`case ${entry.id}: missing repair guidance for ${entry.expectedDiagnostic}`)
		}
	}
	finally {
		await rm(invalidRoot, { recursive: true, force: true })
	}
	const repairedRoot = await writeProject(entry.repaired.files)
	try {
		const result = runCli(entry.check, repairedRoot)
		if (result.status !== 0) {
			throw new Error(`case ${entry.id}: repaired source should pass, got exit ${result.status}\n${result.stdout}${result.stderr}`)
		}
	}
	finally {
		await rm(repairedRoot, { recursive: true, force: true })
	}
}

function runCli(check, cwd) {
	return spawnSync(process.execPath, [cliPath, check, '--format', 'json'], { cwd, encoding: 'utf8' })
}

async function writeProject(files) {
	const root = await mkdtemp(join(tmpdir(), 'jst-corpus-'))
	for (const [relativePath, content] of Object.entries(files)) {
		const path = resolve(root, relativePath)
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, content)
	}
	return root
}

function describe(messages) {
	if (!messages.length) {
		return 'no messages'
	}
	return messages.map(message => `${message.ruleId ?? 'parser'}:${message.messageId ?? message.message}`).join(', ')
}
