import { strict as assert } from 'node:assert'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { ESLint } from 'eslint'
import plugin from '../src/index.mjs'

test('rejects circular production imports', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-cycle-'))
	try {
		await mkdir(resolve(root, 'src/shared'), { recursive: true })
		await writeFile(resolve(root, 'src/shared/alpha.lib.js'), "import { beta } from './beta.lib.js'\nexport const alpha = beta\n")
		await writeFile(resolve(root, 'src/shared/beta.lib.js'), "import { alpha } from './alpha.lib.js'\nexport const beta = alpha\n")
		const eslint = new ESLint({ cwd: root, overrideConfig: plugin.configs.recommended, overrideConfigFile: true })
		const results = await eslint.lintFiles(['src/**/*.js'])
		assert.ok(results.flatMap(result => result.messages).some(message => message.ruleId === 'import-x/no-cycle'))
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
