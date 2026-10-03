import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { Linter } from 'eslint'
import typescriptParser from '@typescript-eslint/parser'
import plugin from '../src/index.mjs'

const linter = new Linter({ configType: 'flat' })
const config = [{
	files: ['**/*.{ts,tsx}'],
	languageOptions: {
		ecmaVersion: 'latest',
		parserOptions: { ecmaFeatures: { jsx: true } },
		sourceType: 'module',
	},
	plugins: { jst: plugin },
	rules: Object.fromEntries(Object.keys(plugin.rules).map(name => [`jst/${name}`, 'error'])),
}]

test('enforces every layer direction and isolates slices', () => {
	const allowed = {
		app: ['app', 'pages', 'widgets', 'features', 'entities', 'shared'],
		pages: ['pages', 'widgets', 'features', 'entities', 'shared'],
		widgets: ['widgets', 'features', 'entities', 'shared'],
		features: ['features', 'entities', 'shared'],
		entities: ['entities', 'shared'],
		shared: ['shared'],
	}
	assert.match(text(lint("export { value } from '@/app/value.lib'", 'src/pages/home/value.lib.ts')), /pages cannot depend on app/u)
	assert.match(text(lint("const value = import('@/features/cart/value.lib')", 'src/features/orders/value.lib.ts')), /Do not import directly across features slices/u)
	const layers = Object.keys(allowed)
	for (const source of layers) {
		for (const target of layers) {
			const targetPath = ['pages', 'widgets', 'features', 'entities'].includes(target) && source !== target
				? `@/${target}/target/target.public`
				: `@/${target}/target/value.lib`
			const messages = lint(`import '${targetPath}'`, `src/${source}/source/value.lib.ts`)
			const shouldAllow = allowed[source].includes(target) && (source !== target || ['app', 'shared'].includes(source))
			assert.equal(errors(messages).length === 0, shouldAllow, `${source} → ${target}`)
		}
	}
})

test('requires public slice APIs for cross-layer consumers', () => {
	assert.match(
		text(lint("import { Order } from '@/entities/order/model/order.model'", 'src/features/checkout/checkout.entry.tsx')),
		/entities\/order through its order\.public public API/u,
	)
	assert.equal(errors(lint("import { Order } from '@/entities/order/order.public'", 'src/features/checkout/checkout.entry.tsx')).length, 0)
})

test('enforces filenames and every structural role with actionable errors', () => {
	const cases = [
		['src/entities/order/ui/BadName.ts', /Rename "BadName\.ts"/u],
		['src/shared/api/http.client.ts', /Rename "http\.client\.ts"/u],
		['src/entities/order/ui/orders.store.ts', /Move store files into the slice root directory/u],
		['src/entities/order/model/orders.adapter.ts', /Move adapter files into the slice repository directory/u],
		['src/features/order/model/order.component.tsx', /Move component files into the slice ui directory/u],
		['src/entities/order/ui/order.service.ts', /Move service files into the slice services directory/u],
	]
	for (const [filename, pattern] of cases) {
		assert.match(text(lint('export const value = 1', filename)), pattern)
	}
})

test('creates a custom standard without editing rule implementations', () => {
	const custom = plugin.createConfig({
		files: { testSuffixes: ['spec'] },
		limits: { maxLines: 400 },
	})
	assert.equal(errors(linter.verify('export const value = 1', custom, { filename: 'src/shared/lib/value.spec.ts' })).length, 0)
	assert.match(text(linter.verify('export const value = 1', custom, { filename: 'src/shared/lib/value.test.ts' })), /Rename "value\.test\.ts"/u)
	assert.deepEqual(custom[0].rules['max-lines'], ['error', { max: 400, skipBlankLines: true, skipComments: true }])
})

test('keeps network, persistence, and browser effects behind adapters', () => {
	const invalidCases = [
		"import axios from 'axios'; export const load = () => axios.get('/orders')",
		'export const save = value => firebase.firestore().add(value)',
		"export const open = () => new WebSocket('wss://example.test')",
		"export const save = value => { document.cookie = value }",
		"export const notify = value => navigator.sendBeacon('/events', value)",
		"export const load = () => import('axios')",
	]
	for (const source of invalidCases) {
		assert.match(text(lint(source, 'src/entities/order/model/orders.model.ts')), /Move .* access behind/u)
	}
	assert.equal(errors(lint("import axios from 'axios'; export const load = () => axios.get('/orders')", 'src/entities/order/repository/orders.repository.ts')).length, 0)
})

test('does not confuse shadowed names or package prefixes with effects', () => {
	const localEffects = 'export function run(fetch, WebSocket, localStorage) { fetch(); new WebSocket(); return localStorage.get() }'
	assert.equal(errors(lint(localEffects, 'src/entities/order/model/order.model.ts')).length, 0)
	assert.equal(errors(lint("import client from 'axios-retry'", 'src/entities/order/model/order.model.ts')).length, 0)
	assert.equal(errors(lint("import { atom } from '@reatomized/core'", 'src/entities/order/model/order.model.ts')).length, 0)
})

test('keeps models and services independent from state managers', () => {
	assert.match(text(lint("import { atom } from '@reatom/core'", 'src/entities/order/model/order.model.ts')), /Models, services, repositories, and views stay state-manager agnostic/u)
	assert.equal(errors(lint("import { atom } from '@reatom/core'; export const orders = atom([])", 'src/entities/order/orders.store.ts')).length, 0)
	assert.equal(errors(lint("import { reatomComponent } from '@reatom/react'", 'src/features/orders/orders.entry.tsx')).length, 0)
})

test('restricts imported service locators to composition roots', () => {
	assert.match(
		text(lint("import { useService as resolveService } from '@/shared/di/serviceLocator.context'", 'src/features/orders/orders.entry.tsx')),
		/useService is restricted to app\/pages/u,
	)
	assert.equal(errors(lint("import { useService } from '@/shared/di/serviceLocator.context'", 'src/pages/orders/orders.page.tsx')).length, 0)
})

test('rejects the five previously missed architecture violations', () => {
	const cases = [
		["import axios from 'axios'; export function Checkout() { const total = items.reduce((sum, item) => sum + item.price, 0); return axios.post('/checkout', { total }) }", 'src/features/checkout/ui/checkout.component.tsx'],
		["import { useQuery } from '@tanstack/react-query'; export function Orders() { return useQuery({ queryKey: ['orders'], queryFn: api.orders }) }", 'src/features/orders/ui/orders.component.tsx'],
		['export const orders = {}', 'src/features/orders/ui/orders.store.ts'],
		['export const save = value => firebase.firestore().add(value)', 'src/features/orders/model/orders.model.ts'],
		['export function Button({ primary, danger, compact }) { return null }', 'src/shared/ui/button.component.tsx'],
	]
	for (const [source, filename] of cases) {
		assert.ok(errors(lint(source, filename)).length > 0, filename)
	}
})

test('allows props-driven views, local presentation state, and repository effects', () => {
	const view = "import { useState } from 'react'; export function Orders({ items, onSelect }) { const [open, setOpen] = useState(false); return items.map(item => item.name) }"
	assert.equal(errors(lint(view, 'src/features/orders/ui/orders.component.tsx')).length, 0)
	assert.equal(errors(lint("import axios from 'axios'; export const load = () => axios.get('/orders')", 'src/entities/order/repository/orders.repository.ts')).length, 0)
})

test('moves view calculations out while allowing render mapping', () => {
	assert.match(text(lint('export function Total({ items }) { return items.reduce((sum, item) => sum + item.price, 0) }', 'src/features/orders/ui/total.component.tsx')), /Move aggregation/u)
	assert.equal(errors(lint('export function List({ items }) { return items.map(item => item.name) }', 'src/features/orders/ui/list.component.tsx')).length, 0)
})

test('rejects inline JST disables and requires reasons for other suppressions', () => {
	assert.match(text(lint('// eslint-disable-next-line jst/import-contract\nexport const value = 1', 'src/shared/lib/value.lib.ts')), /Do not disable JST rules inline/u)
	assert.match(text(lint('// eslint-disable-next-line no-console\nconsole.log(1)', 'src/shared/lib/value.lib.ts')), /Add a -- description/u)
	assert.doesNotMatch(text(lint('// eslint-disable-next-line no-console -- migration compatibility\nconsole.log(1)', 'src/shared/lib/value.lib.ts')), /Add a -- description/u)
})

test('checks typed component props without flagging unrelated domain types', () => {
	const invalid = 'interface ButtonProps { primary: boolean; danger: boolean }\nexport function Button(props: ButtonProps) { return null }'
	const unrelated = 'interface FeatureFlags { primary: boolean; danger: boolean }\nexport function Button() { return null }'
	assert.match(text(lintTypescript(invalid, 'src/shared/ui/button.component.tsx')), /Replace boolean variant props/u)
	assert.doesNotMatch(text(lintTypescript(unrelated, 'src/shared/ui/button.component.tsx')), /Replace boolean variant props/u)
})

function lint(code, filename) {
	return linter.verify(code, config, { filename })
}

function lintTypescript(code, filename) {
	return linter.verify(code, [{
		...config[0],
		languageOptions: { ...config[0].languageOptions, parser: typescriptParser },
	}], { filename })
}

function errors(messages) {
	return messages.filter(message => message.severity === 2)
}

function text(messages) {
	return messages.map(message => message.message).join('\n')
}
