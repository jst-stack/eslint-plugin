# @jst-stack/eslint-plugin

Executable architecture and source-quality contracts for JST React applications.

The default preset works out of the box, but every project convention lives in one replaceable policy. You can change a filename suffix, directory contract, dependency direction, recognized effect, or source limit without editing or forking a rule.

## Install

Until the package is published to npm, install it from GitHub:

```bash
npm install --save-dev github:jst-stack/eslint-plugin
```

The package requires ESLint 9.5+ or 10 and Node.js 20.19+.
For reproducible application builds, pin the reviewed commit in `package.json`.

## Use the strict defaults

```js
import antfu from '@antfu/eslint-config'
import jst from '@jst-stack/eslint-plugin'

export default antfu(
  { react: true, typescript: true },
  ...jst.configs.recommended,
)
```

The preset enforces:

- the exact `app → pages → widgets → features → entities → shared` dependency matrix;
- isolation between sibling production slices;
- `<lowerCamelName>.<role>.<extension>` filenames and role placement;
- network, browser, persistence, and state-manager boundaries;
- props-driven UI without async orchestration, aggregation, or flag-prop combinations;
- complexity, nesting, parameter, function-size, and file-size limits.

Tests may reach composition roots. Production slices must communicate through a higher composition layer or a narrow injected port.

## Override the policy

Call `jst.createConfig()` instead of editing plugin source. Only supplied values change; every other JST default remains active.

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
  },
})
```

`imports.statePackages` keeps domain code independent from a state manager. `ui.statePackages` keeps presentational components props-driven.

## Available policy fields

| Section | Fields | Merge behavior |
| --- | --- | --- |
| `files` | `frameworkFiles`, `roles`, `testSuffixes` | Arrays replace defaults |
| `files` | `roleDirectories`, `sliceDirectories` | Objects merge by key |
| `imports` | `alias`, `slicedLayers`, `statePackages` | Values and arrays replace defaults |
| `imports` | `layers` | Object merges by layer key |
| `effects` | `packages`, `globals`, `constructors` | Arrays replace defaults |
| `ui` | `statePackages`, `booleanVariantNames`, `calculationMethods` | Arrays replace defaults |
| `limits` | `complexity`, `maxDepth`, `maxLines`, `maxLinesPerFunction`, `maxParams` | Object merges by key |

Use `jst.defaultPolicy` when you want to append to an array rather than replace it.

## CLI checks

Add cross-file architecture and stylesheet ownership checks alongside ESLint:

```json
{
  "scripts": {
    "lint:architecture": "jst-lint architecture",
    "lint:styles": "jst-lint styles && stylelint \"src/**/*.css\""
  }
}
```

Use `*.adapter.ts` for browser and HTTP adapters. React Router reserves `*.client.*` for client-only modules, so it is intentionally not a default JST role.
