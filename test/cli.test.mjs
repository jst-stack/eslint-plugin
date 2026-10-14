import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { diagnostic, diagnosticCodes } from '../src/diagnostics/diagnostic.model.mjs'

const cli = resolve('bin/jst-lint.mjs')

test('keeps diagnostic codes unique and metadata mandatory', () => {
	assert.equal(new Set(diagnosticCodes).size, diagnosticCodes.length)
	const value = diagnostic('styles.module-name', 'reason', 'repair')
	assert.deepEqual(Object.keys(value).sort(), ['code', 'docsUrl', 'message', 'repair'])
	assert.throws(() => diagnostic('unknown.code', 'reason', 'repair'), /Unknown diagnostic code/u)
})

test('publishes one machine-readable diagnostic document', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-cli-'))
	try {
		await mkdir(resolve(root, 'src/features/cart/ui'), { recursive: true })
		await writeFile(resolve(root, 'package.json'), '{}')
		await writeFile(resolve(root, 'src/features/cart/ui/cart.css'), '')
		const result = spawnSync(process.execPath, [cli, 'styles', '--format', 'json'], { cwd: root, encoding: 'utf8' })

		assert.equal(result.status, 1)
		assert.equal(result.stderr, '')
		const payload = JSON.parse(result.stdout)
		assert.equal(payload.diagnostics[0].code, 'styles.module-name')
		assert.match(payload.diagnostics[0].repair, /Rename the file/u)
		assert.match(payload.diagnostics[0].docsUrl, /cli-diagnostics\.md/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})

test('keeps pretty diagnostics readable and distinguishes invocation failures', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-cli-'))
	try {
		await mkdir(resolve(root, 'src/features/cart/ui'), { recursive: true })
		await writeFile(resolve(root, 'package.json'), '{}')
		await writeFile(resolve(root, 'src/features/cart/ui/cart.css'), '')
		const violation = spawnSync(process.execPath, [cli, 'styles'], { cwd: root, encoding: 'utf8' })
		assert.equal(violation.status, 1)
		assert.match(violation.stderr, /\[styles\.module-name\]/u)
		assert.match(violation.stderr, /Repair:/u)

		const invalid = spawnSync(process.execPath, [cli, 'unknown'], { cwd: root, encoding: 'utf8' })
		assert.equal(invalid.status, 2)
		assert.match(invalid.stderr, /Usage:/u)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
