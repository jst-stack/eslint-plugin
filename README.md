# @jst-stack/eslint-plugin

Executable architecture and source-quality contracts for JST React applications.

## Usage

```js
import antfu from '@antfu/eslint-config'
import jst from '@jst-stack/eslint-plugin'

export default antfu(
  { react: true, typescript: true },
  ...jst.configs.recommended,
)
```

```json
{
  "scripts": {
    "lint:architecture": "jst-lint architecture",
    "lint:styles": "jst-lint styles && stylelint \"src/**/*.css\""
  }
}
```

The recommended flat config enforces the exact `app → pages → widgets → features → entities → shared` dependency matrix, same-layer slice isolation, file roles, role placement, effect boundaries, props-driven UI, complexity, nesting, and source-size limits. The CLI checks cross-file DI invariants and CSS Module ownership.

Tests may reach composition roots. Production slices may not import sibling slices directly; compose them from a higher layer or inject a narrow port. UI components cannot import data/state libraries, perform async orchestration or aggregation, or expose multiple boolean variant flags.

Use `*.adapter.ts` for browser and HTTP adapters. React Router reserves `*.client.*` for client-only modules, so it is intentionally not a JST role.

Requires ESLint 9.5+ or 10 and Node.js 20.19+.
