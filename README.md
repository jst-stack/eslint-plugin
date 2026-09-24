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

The recommended flat config enforces layer direction, file roles, slice structure, effect boundaries, props-driven UI, complexity, nesting, and source-size limits. The CLI checks cross-file architecture invariants and CSS Module ownership.

Use `*.adapter.ts` for browser and HTTP adapters. React Router reserves `*.client.*` for client-only modules, so it is intentionally not a JST role.

Requires ESLint 9.5+ or 10 and Node.js 20.19+.
