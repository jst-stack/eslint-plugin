# @jst-stack/eslint-plugin

[![npm](https://img.shields.io/npm/v/@jst-stack/eslint-plugin?style=flat-square)](https://www.npmjs.com/package/@jst-stack/eslint-plugin)
[![CI](https://img.shields.io/github/actions/workflow/status/jst-stack/eslint-plugin/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/jst-stack/eslint-plugin/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jst-stack/eslint-plugin/badge)](https://scorecard.dev/viewer/?uri=github.com/jst-stack/eslint-plugin)

Executable architecture and source-quality contracts for JST React applications.

The default preset works out of the box, but every project convention lives in one typed, runtime-validated policy. Unknown keys and inconsistent combinations fail before linting starts.

## Install

Install the published package:

```bash
npm install --save-dev @jst-stack/eslint-plugin
```

The package requires ESLint 9.5+ or 10 and Node.js 24.15+.
Commit the generated lockfile for reproducible application builds.

## Use the strict defaults

```js
import antfu from '@antfu/eslint-config'
import jst, { defineConfig } from '@jst-stack/eslint-plugin'
import policy from './jst.config.ts'

export default antfu(
  { react: true, typescript: true },
  ...jst.createConfig(policy),
)
```

Create `jst.config.ts` at the project root. ESLint and `jst-lint` consume this same normalized policy:

```ts
import { defineConfig } from '@jst-stack/eslint-plugin'

export default defineConfig({
  styles: { moduleExtension: 'css' },
})
```

Editors and external tooling can consume the published JSON Schema from `@jst-stack/eslint-plugin/schema`.

The preset enforces:

- the exact `app → pages → modules → widgets → features → entities → shared` dependency matrix;
- isolation between sibling production slices;
- bounded-context public APIs plus workspace package exports, ADRs, declared dependencies, and cycle freedom;
- `<lowerCamelName>.<role>.<extension>` filenames and role placement;
- network, browser, persistence, and state-manager boundaries;
- props-driven UI without async orchestration, aggregation, or flag-prop combinations;
- complexity, nesting, parameter, function-size, and file-size limits.

Rule reference: [`import-contract`](docs/rules/import-contract.md), [`file-contract`](docs/rules/file-contract.md), [`effects-at-boundary`](docs/rules/effects-at-boundary.md), [`ui-contract`](docs/rules/ui-contract.md), and [`disable-directive`](docs/rules/disable-directive.md).

Tests may reach composition roots. Production slices must communicate through a higher composition layer or a narrow injected port.
Cross-layer consumers import sliced modules through `<slice>.public.ts`; deep imports are rejected. Circular production imports are rejected as well.

## Override the policy

Call `jst.createConfig()` instead of editing plugin source. Only supplied values change; every other JST default remains active.

Prefer changing `jst.config.ts` and passing it to `createConfig(policy)` as shown above. The CLI reads that file automatically.

### Use `*.spec.ts` instead of `*.test.ts`

```js
export default antfu(
  { react: true, typescript: true },
  ...jst.createConfig({
    files: { testSuffixes: ['spec'] },
  }),
)
```

Allow both conventions with `testSuffixes: ['test', 'spec']`.

### Change source limits

```js
...jst.createConfig({
  limits: {
    complexity: 15,
    maxDepth: 4,
    maxLines: 300,
    maxLinesPerFunction: 100,
    maxParams: 5,
  },
})
```

You may override one limit without repeating the others.

### Add or move a file role

```js
...jst.createConfig({
  files: {
    roles: [...jst.defaultPolicy.files.roles, 'controller'],
    roleDirectories: {
      controller: 'services',
      viewModel: 'model',
    },
  },
})
```

`null` means the slice root:

```js
...jst.createConfig({
  files: {
    roleDirectories: { service: null },
  },
})
```

### Change allowed slice directories

```js
...jst.createConfig({
  files: {
    sliceDirectories: {
      features: ['__tests__', 'lib', 'model', 'services', 'ui'],
    },
  },
})
```

The supplied `features` list replaces that list only. Entity and widget defaults remain unchanged.

### Change dependency direction

Each key describes the layers it may import:

```js
...jst.createConfig({
  imports: {
    layers: {
      pages: ['pages', 'widgets', 'features', 'entities', 'shared'],
      features: ['features', 'entities', 'shared'],
    },
  },
})
```

Layer entries are merged by key. To permit direct sibling-slice imports for a deliberate project exception, remove that layer from `slicedLayers`:

```js
...jst.createConfig({
  imports: {
    slicedLayers: ['pages', 'widgets', 'entities'],
  },
})
```

You can also replace the source alias:

```js
...jst.createConfig({ imports: { alias: '~/' } })
```

### Register another effect library

Arrays replace their defaults, so spread the default list when adding a value:

```js
...jst.createConfig({
  effects: {
    packages: [...jst.defaultPolicy.effects.packages, 'ofetch'],
  },
})
```

The same section exposes:

- `packages` — modules allowed only at effect boundaries;
- `globals` — browser or SDK globals such as `localStorage` and `firebase`;
- `constructors` — effectful constructors such as `WebSocket` and `Worker`.

### Register a state manager or UI convention

```js
...jst.createConfig({
  imports: {
    statePackages: [...jst.defaultPolicy.imports.statePackages, '@legendapp/state'],
  },
  ui: {
    statePackages: [...jst.defaultPolicy.ui.statePackages, '@legendapp/state/react'],
    booleanVariantNames: [...jst.defaultPolicy.ui.booleanVariantNames, 'destructive'],
    calculationMethods: [...jst.defaultPolicy.ui.calculationMethods, 'groupBy'],
	forbiddenImportPatterns: [...jst.defaultPolicy.ui.forbiddenImportPatterns, '**/legacy-data/**'],
  },
})
```

`imports.statePackages` keeps domain code independent from a state manager. `ui.statePackages` keeps presentational components props-driven. UI import patterns may contain `{alias}`; normalization replaces it with `imports.alias`, so changing the project alias does not require editing the preset implementation.

## Available policy fields

| Section | Fields | Merge behavior |
| --- | --- | --- |
| `files` | `frameworkFiles`, `roles`, `testSuffixes` | Arrays replace defaults |
| `files` | `roleDirectories`, `sliceDirectories` | Objects merge by key |
| `generator` | `layers` | Maps CLI slice kinds to policy layer directories; object merges by key |
| `generator` | `testDirectory` | Replaces the generated test directory |
| `imports` | `alias`, `slicedLayers`, `statePackages` | Values and arrays replace defaults |
| `imports` | `layers` | Object merges by layer key |
| `effects` | `packages`, `globals`, `constructors` | Arrays replace defaults |
| `architecture` | `containerFiles`, `providerGlobs`, `requiredDependencies`, `serviceLocatorOwners` | Arrays replace defaults |
| `architecture` | `packageRoots`, `requiredDecisionHeadings` | Arrays replace defaults |
| `architecture` | `decisionDirectory` | Replaces the default |
| `styles` | `globalFiles`, `moduleExtension` | Arrays/values replace defaults |
| root | `exceptions` | Array replaces defaults |
| `ui` | `statePackages`, `booleanVariantNames`, `calculationMethods`, `forbiddenImportPatterns` | Arrays replace defaults |
| `limits` | `complexity`, `maxDepth`, `maxLines`, `maxLinesPerFunction`, `maxParams`, `maxPublicApiExports` | Object merges by key |
| `performance.budgets` | `gzipCssBytes`, `gzipJavaScriptBytes`, `unexpectedChunks` | Object merges by key; arrays replace defaults |

Use `jst.defaultPolicy` when you want to append to an array rather than replace it.

### Configure application budgets

```ts
export default defineConfig({
  performance: {
    budgets: {
      gzipCssBytes: 50_000,
      gzipJavaScriptBytes: 250_000,
      unexpectedChunks: ['legacy-vendor'],
    },
  },
})
```

The policy only owns the limits. The application build check measures its own output, so the plugin remains independent from Vite and other bundlers.

### Add a reviewed exception

JST rules cannot be disabled inline. Put a narrow, explained exception in policy; an expired exception fails the run:

```ts
export default defineConfig({
  exceptions: [{
    files: ['src/entities/legacy/**'],
    rules: ['jst/import-contract'],
    reason: 'Remove after the billing migration',
    owner: 'platform',
    expires: '2027-01-31',
  }],
})
```

Other ESLint suppressions remain available but must include `-- a concrete reason`.

## CLI checks

Add cross-file architecture and stylesheet ownership checks alongside ESLint:

```json
{
  "scripts": {
		"lint:architecture": "jst-lint architecture",
		"lint:budgets": "jst-lint budgets",
    "lint:styles": "jst-lint styles && stylelint \"src/**/*.css\""
  }
}
```

Use `*.adapter.ts` for browser and HTTP adapters. React Router reserves `*.client.*` for client-only modules, so it is intentionally not a default JST role.

### Bounded contexts and packages

The optional `modules` layer is a coarse product boundary, not another name for a one-button feature. A module may keep internal pages, model, services, repository, and UI together, but consumers import only `<module>.public.ts`. Its public API export count is bounded by `limits.maxPublicApiExports`.

When `architecture.packageRoots` contains workspace packages, `jst-lint architecture` also requires:

- root workspace registration;
- one explicit `.` export and no wildcard deep exports;
- no imports through another package's `src`;
- declared internal dependencies and an acyclic workspace graph;
- an extraction ADR under `architecture.decisionDirectory` with every `requiredDecisionHeadings` section.

A package with `jst.kind: "microfrontend"` must additionally declare `jst.owner`, `jst.hostContract`, `jst.fallback`, and independent `build`/`test` scripts. The plugin deliberately does not prescribe Module Federation or another runtime mechanism.

## Policy migrations

Policy additions are backward-compatible when defaults preserve existing behavior. A release that removes or changes a field records the replacement in [`CHANGELOG.md`](CHANGELOG.md) and ships a matching `jst migrate` step in `create-jst`. Unknown fields intentionally fail fast instead of being ignored. Upgrade the plugin and CLI together according to the JST compatibility manifest, run the migration from a clean Git tree, then run the complete project `check` command.
