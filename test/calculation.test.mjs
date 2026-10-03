import { strict as assert } from 'node:assert'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'
import typescriptParser from '@typescript-eslint/parser'
import { ESLint } from 'eslint'
import plugin from '../src/index.mjs'

test('uses TypeScript types to avoid custom-method calculation false positives', async () => {
	const root = await mkdtemp(resolve(tmpdir(), 'jst-calculation-'))
	try {
		const sourceRoot = resolve(root, 'src/features/orders/ui')
		await mkdir(sourceRoot, { recursive: true })
		await writeFile(resolve(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }))
		await writeFile(resolve(sourceRoot, 'orders.component.tsx'), `
const formatter = { sort: () => 'sorted' }
export function Orders({ items }: { items: string[] }) {
	formatter.sort()
	return items.sort().join(', ')
}
`)
		const config = [
			...plugin.configs.recommended,
			{
				files: ['**/*.tsx'],
				languageOptions: {
					parser: typescriptParser,
					parserOptions: { project: './tsconfig.json', tsconfigRootDir: root },
				},
			},
		]
		const eslint = new ESLint({ cwd: root, overrideConfig: config, overrideConfigFile: true })
		const [result] = await eslint.lintFiles(['src/**/*.tsx'])
		const calculations = result.messages.filter(message => message.ruleId === 'jst/ui-contract' && /aggregation/u.test(message.message))
		assert.equal(calculations.length, 1)
	}
	finally {
		await rm(root, { force: true, recursive: true })
	}
})
