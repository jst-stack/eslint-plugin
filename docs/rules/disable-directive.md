# `jst/disable-directive`

Rejects inline JST suppressions and requires a reason for other ESLint suppressions.

```ts
// valid
// eslint-disable-next-line no-console -- required CLI output
console.log(message)

// invalid: use a reviewed jst.config.ts exception
// eslint-disable-next-line jst/import-contract
```

Project exceptions require `files`, `rules`, and `reason`; `owner` and `expires` are optional.
