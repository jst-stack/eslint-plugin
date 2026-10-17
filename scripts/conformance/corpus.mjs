const composition = "import.meta.glob(['../../entities/**/*.provider.ts', '../../features/**/*.provider.ts', '../../modules/**/*.provider.ts', '../../shared/**/*.provider.ts'])"

const rootManifest = `{
	"dependencies": {
		"@needle-di/core": "1.0.0"
	}
}
`

const workspaceManifest = `{
	"dependencies": {
		"@needle-di/core": "1.0.0"
	},
	"workspaces": [
		"packages/*"
	]
}
`

const ordersManifest = `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`

const paymentsManifest = `{
	"name": "@jst-internal/payments",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-payments.md",
		"kind": "bounded-context"
	}
}
`

const ordersWithPaymentsManifest = `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"dependencies": {
		"@jst-internal/payments": "workspace:*"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`

const paymentsWithOrdersManifest = `{
	"name": "@jst-internal/payments",
	"exports": {
		".": "./src/index.ts"
	},
	"dependencies": {
		"@jst-internal/orders": "workspace:*"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-payments.md",
		"kind": "bounded-context"
	}
}
`

const microfrontendManifest = `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "microfrontend",
		"fallback": "./src/index.ts",
		"hostContract": "./host-contract.ts",
		"owner": "checkout"
	},
	"scripts": {
		"build": "vite build",
		"test": "node --test"
	}
}
`

const microfrontendMissingContractManifest = `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "microfrontend"
	}
}
`

const microfrontendMissingScriptsManifest = `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "microfrontend",
		"fallback": "./src/index.ts",
		"hostContract": "./host-contract.ts",
		"owner": "checkout"
	}
}
`

const ordersDecision = '# Extract orders\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Revisit when\n\n## Rollback\n'
const paymentsDecision = '# Extract payments\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Revisit when\n\n## Rollback\n'

const ARCHITECTURE = {
	'package.json': rootManifest,
	'src/app/container/container.composition.ts': composition,
	'src/pages/value.lib.ts': 'export const value = 1\n',
	'src/modules/value.lib.ts': 'export const value = 1\n',
	'src/widgets/value.lib.ts': 'export const value = 1\n',
	'src/features/value.lib.ts': 'export const value = 1\n',
	'src/entities/value.lib.ts': 'export const value = 1\n',
	'src/shared/value.lib.ts': 'export const value = 1\n',
}

const WORKSPACE = {
	...ARCHITECTURE,
	'package.json': workspaceManifest,
	'docs/decisions/0001-extract-orders.md': ordersDecision,
	'docs/decisions/0001-extract-payments.md': paymentsDecision,
	'packages/orders/package.json': ordersManifest,
	'packages/orders/src/index.ts': 'export const orders = true\n',
	'packages/payments/package.json': paymentsManifest,
	'packages/payments/src/index.ts': 'export const payments = true\n',
}

function omit(source, ...keys) {
	const files = { ...source }
	for (const key of keys) {
		delete files[key]
	}
	return files
}

export const corpus = [
	{
		id: 'architecture.kernel-dependency',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...ARCHITECTURE, 'package.json': '{\n\t"name": "jst-app"\n}\n' } },
		repaired: { files: ARCHITECTURE },
		expectedDiagnostic: 'architecture.kernel-dependency',
	},
	{
		id: 'architecture.layer-directory',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: omit(ARCHITECTURE, 'src/shared/value.lib.ts') },
		repaired: { files: ARCHITECTURE },
		expectedDiagnostic: 'architecture.layer-directory',
	},
	{
		id: 'architecture.module-public-api',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...ARCHITECTURE, 'src/modules/billing/value.lib.ts': 'export const value = 1\n' } },
		repaired: {
			files: {
				...ARCHITECTURE,
				'src/modules/billing/value.lib.ts': 'export const value = 1\n',
				'src/modules/billing/billing.public.ts': 'export const billing = 1\n',
			},
		},
		expectedDiagnostic: 'architecture.module-public-api',
	},
	{
		id: 'architecture.module-public-api-budget',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...ARCHITECTURE,
				'src/modules/billing/billing.public.ts': 'export const billing = 1\nexport const invoice = 2\n',
				'jst.config.mjs': 'export default { limits: { maxPublicApiExports: 1 } }\n',
			},
		},
		repaired: {
			files: {
				...ARCHITECTURE,
				'src/modules/billing/billing.public.ts': 'export const billing = 1\n',
				'jst.config.mjs': 'export default { limits: { maxPublicApiExports: 1 } }\n',
			},
		},
		expectedDiagnostic: 'architecture.module-public-api-budget',
	},
	{
		id: 'architecture.provider-discovery',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...ARCHITECTURE, 'src/app/container/container.composition.ts': 'export const container = {}\n' } },
		repaired: { files: ARCHITECTURE },
		expectedDiagnostic: 'architecture.provider-discovery',
	},
	{
		id: 'architecture.provider-scope',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...ARCHITECTURE, 'src/features/orders/orders.provider.ts': 'export function provider() {}\n' } },
		repaired: {
			files: {
				...ARCHITECTURE,
				'src/features/orders/orders.provider.ts': "export const scope = 'request' as const\nexport function provider() {}\n",
			},
		},
		expectedDiagnostic: 'architecture.provider-scope',
	},
	{
		id: 'budgets.css-gzip',
		runner: 'cli',
		check: 'budgets',
		invalid: {
			files: {
				'build/client/assets/app.css': '.root { display: block }\n',
				'jst.config.mjs': 'export default { performance: { budgets: { gzipCssBytes: 1 } } }\n',
			},
		},
		repaired: {
			files: {
				'build/client/assets/app.css': '.root { display: block }\n',
				'jst.config.mjs': 'export default { performance: { budgets: { gzipCssBytes: 1000 } } }\n',
			},
		},
		expectedDiagnostic: 'budgets.css-gzip',
	},
	{
		id: 'budgets.javascript-gzip',
		runner: 'cli',
		check: 'budgets',
		invalid: {
			files: {
				'build/client/assets/app.js': 'export const value = 1\n',
				'jst.config.mjs': 'export default { performance: { budgets: { gzipJavaScriptBytes: 1 } } }\n',
			},
		},
		repaired: {
			files: {
				'build/client/assets/app.js': 'export const value = 1\n',
				'jst.config.mjs': 'export default { performance: { budgets: { gzipJavaScriptBytes: 1000 } } }\n',
			},
		},
		expectedDiagnostic: 'budgets.javascript-gzip',
	},
	{
		id: 'budgets.unexpected-chunk',
		runner: 'cli',
		check: 'budgets',
		invalid: {
			files: {
				'build/client/assets/app.js': 'export const value = 1\n',
				'jst.config.mjs': "export default { performance: { budgets: { unexpectedChunks: ['app'] } } }\n",
			},
		},
		repaired: {
			files: {
				'build/client/assets/app.js': 'export const value = 1\n',
				'jst.config.mjs': 'export default { performance: { budgets: { unexpectedChunks: [] } } }\n',
			},
		},
		expectedDiagnostic: 'budgets.unexpected-chunk',
	},
	{
		id: 'styles.module-name',
		runner: 'cli',
		check: 'styles',
		invalid: { files: { 'src/features/cart/ui/cart.css': '' } },
		repaired: {
			files: {
				'src/features/cart/ui/cart.module.css': '',
				'src/features/cart/ui/cart.tsx': 'export const Cart = () => null\n',
			},
		},
		expectedDiagnostic: 'styles.module-name',
	},
	{
		id: 'styles.owner-missing',
		runner: 'cli',
		check: 'styles',
		invalid: { files: { 'src/features/cart/ui/cart.module.css': '' } },
		repaired: {
			files: {
				'src/features/cart/ui/cart.module.css': '',
				'src/features/cart/ui/cart.tsx': 'export const Cart = () => null\n',
			},
		},
		expectedDiagnostic: 'styles.owner-missing',
	},
	{
		id: 'workspace.decision-headings',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'docs/decisions/0001-extract-orders.md': '# Extract orders\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Revisit when\n',
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.decision-headings',
	},
	{
		id: 'workspace.decision-link',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"kind": "bounded-context"
	}
}
`,
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.decision-link',
	},
	{
		id: 'workspace.decision-location',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`,
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.decision-location',
	},
	{
		id: 'workspace.deep-import',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': ordersWithPaymentsManifest,
				'packages/orders/src/index.ts': "export const load = () => import('@jst-internal/payments/src/internal')\n",
			},
		},
		repaired: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': ordersWithPaymentsManifest,
				'packages/orders/src/index.ts': "export const load = () => import('@jst-internal/payments')\n",
			},
		},
		expectedDiagnostic: 'workspace.deep-import',
	},
	{
		id: 'workspace.dependency-cycle',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': ordersWithPaymentsManifest,
				'packages/payments/package.json': paymentsWithOrdersManifest,
			},
		},
		repaired: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': ordersWithPaymentsManifest,
			},
		},
		expectedDiagnostic: 'workspace.dependency-cycle',
	},
	{
		id: 'workspace.manifest-missing',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: omit(WORKSPACE, 'packages/orders/package.json') },
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.manifest-missing',
	},
	{
		id: 'workspace.microfrontend-contract',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...WORKSPACE, 'packages/orders/package.json': microfrontendMissingContractManifest } },
		repaired: { files: { ...WORKSPACE, 'packages/orders/package.json': microfrontendManifest } },
		expectedDiagnostic: 'workspace.microfrontend-contract',
	},
	{
		id: 'workspace.microfrontend-script',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...WORKSPACE, 'packages/orders/package.json': microfrontendMissingScriptsManifest } },
		repaired: { files: { ...WORKSPACE, 'packages/orders/package.json': microfrontendManifest } },
		expectedDiagnostic: 'workspace.microfrontend-script',
	},
	{
		id: 'workspace.name-missing',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': `{
	"exports": {
		".": "./src/index.ts"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`,
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.name-missing',
	},
	{
		id: 'workspace.public-entry',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': `{
	"name": "@jst-internal/orders",
	"exports": {},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`,
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.public-entry',
	},
	{
		id: 'workspace.root-registration',
		runner: 'cli',
		check: 'architecture',
		invalid: { files: { ...WORKSPACE, 'package.json': rootManifest } },
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.root-registration',
	},
	{
		id: 'workspace.undeclared-dependency',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/src/index.ts': "export const load = () => import('@jst-internal/payments')\n",
			},
		},
		repaired: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': ordersWithPaymentsManifest,
				'packages/orders/src/index.ts': "export const load = () => import('@jst-internal/payments')\n",
			},
		},
		expectedDiagnostic: 'workspace.undeclared-dependency',
	},
	{
		id: 'workspace.wildcard-export',
		runner: 'cli',
		check: 'architecture',
		invalid: {
			files: {
				...WORKSPACE,
				'packages/orders/package.json': `{
	"name": "@jst-internal/orders",
	"exports": {
		".": "./src/index.ts",
		"./*": "./src/*"
	},
	"jst": {
		"architectureDecision": "../../docs/decisions/0001-extract-orders.md",
		"kind": "bounded-context"
	}
}
`,
			},
		},
		repaired: { files: WORKSPACE },
		expectedDiagnostic: 'workspace.wildcard-export',
	},
	{
		id: 'imports.layer-direction',
		runner: 'eslint',
		invalid: { files: { 'src/pages/home/value.lib.ts': "export { value } from '@/app/value.lib'" } },
		repaired: { files: { 'src/pages/home/value.lib.ts': "export { value } from '@/shared/value.lib'" } },
		expectedRule: 'jst/import-contract',
		expectedMessageId: 'layer',
	},
	{
		id: 'imports.slice-isolation',
		runner: 'eslint',
		invalid: { files: { 'src/features/orders/orders.entry.tsx': "import { cart } from '@/features/cart/cart.public'" } },
		repaired: { files: { 'src/features/orders/orders.entry.tsx': 'export const orders = true' } },
		expectedRule: 'jst/import-contract',
		expectedMessageId: 'slice',
	},
	{
		id: 'imports.public-api',
		runner: 'eslint',
		invalid: { files: { 'src/features/checkout/checkout.entry.tsx': "import { Order } from '@/entities/order/model/order.model'" } },
		repaired: { files: { 'src/features/checkout/checkout.entry.tsx': "import { Order } from '@/entities/order/order.public'" } },
		expectedRule: 'jst/import-contract',
		expectedMessageId: 'publicApi',
	},
	{
		id: 'imports.state-manager',
		runner: 'eslint',
		invalid: { files: { 'src/entities/order/model/order.model.ts': "import { atom } from '@reatom/core'" } },
		repaired: { files: { 'src/entities/order/orders.store.ts': "import { atom } from '@reatom/core'; export const orders = atom([])" } },
		expectedRule: 'jst/import-contract',
		expectedMessageId: 'state',
	},
	{
		id: 'effects.repository-boundary',
		runner: 'eslint',
		invalid: { files: { 'src/entities/order/model/orders.model.ts': "import axios from 'axios'; export const load = () => axios.get('/orders')" } },
		repaired: { files: { 'src/entities/order/repository/orders.repository.ts': "import axios from 'axios'; export const load = () => axios.get('/orders')" } },
		expectedRule: 'jst/effects-at-boundary',
		expectedMessageId: 'effect',
	},
	{
		id: 'ui.state-import',
		runner: 'eslint',
		invalid: { files: { 'src/features/orders/ui/orders.component.tsx': "import { atom } from '@reatom/core'\nexport function Orders() { return null }" } },
		repaired: { files: { 'src/features/orders/ui/orders.component.tsx': 'export function Orders() { return null }' } },
		expectedRule: 'jst/ui-contract',
		expectedMessageId: 'stateImport',
	},
	{
		id: 'ui.flag-props',
		runner: 'eslint',
		invalid: { files: { 'src/shared/ui/button.component.tsx': 'interface ButtonProps { primary: boolean; danger: boolean }\nexport function Button(props: ButtonProps) { return null }' } },
		repaired: { files: { 'src/shared/ui/button.component.tsx': "interface ButtonProps { variant: 'primary' | 'danger' }\nexport function Button(props: ButtonProps) { return null }" } },
		expectedRule: 'quality/no-flag-prop-combinations',
		expectedMessageId: 'flags',
	},
	{
		id: 'ui.view-calculation',
		runner: 'eslint',
		invalid: { files: { 'src/features/orders/ui/total.component.tsx': 'export function Total({ items }) { return items.reduce((sum, item) => sum + item.price, 0) }' } },
		repaired: { files: { 'src/features/orders/ui/total.component.tsx': 'export function Total({ items }) { return items.length }' } },
		expectedRule: 'quality/no-heavy-render-work',
		expectedMessageId: 'calculation',
	},
	{
		id: 'files.file-name',
		runner: 'eslint',
		invalid: { files: { 'src/entities/order/ui/BadName.ts': 'export const value = 1' } },
		repaired: { files: { 'src/entities/order/ui/order.component.tsx': 'export const value = 1' } },
		expectedRule: 'jst/file-contract',
		expectedMessageId: 'fileName',
	},
	{
		id: 'disables.inline-suppression',
		runner: 'eslint',
		invalid: { files: { 'src/shared/lib/value.lib.ts': '// eslint-disable-next-line jst/import-contract\nexport const value = 1' } },
		repaired: { files: { 'src/shared/lib/value.lib.ts': 'export const value = 1' } },
		expectedRule: 'jst/disable-directive',
		expectedMessageId: 'jstRule',
	},
]
