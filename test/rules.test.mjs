import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { Linter } from 'eslint'
import plugin from '../src/index.mjs'

const linter = new Linter({ configType: 'flat' })
const config = [{
	files: ['**/*.{ts,tsx}'],
	languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	plugins: { jst: plugin },
	rules: {
		'jst/effects-at-boundary': 'error',
		'jst/file-contract': 'error',
	},
}]

test('reports an actionable filename and role-directory error', () => {
	const messages = lint('export const value = 1', 'src/entities/order/ui/BadName.ts')
	assert.match(messages.join('\n'), /Rename "BadName\.ts"/u)
})

test('reports effects outside adapters and accepts repository effects', () => {
	const invalid = lint('export const load = () => fetch("/orders")', 'src/features/orders/model/orders.model.ts')
	const valid = lint('export const load = () => fetch("/orders")', 'src/entities/order/repository/orders.repository.ts')
	assert.match(invalid.join('\n'), /Move fetch access behind an entity repository/u)
	assert.deepEqual(valid, [])
})

function lint(code, filename) {
	return linter.verify(code, config, { filename }).map(message => message.message)
}
