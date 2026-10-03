# `jst/effects-at-boundary`

Keeps network, browser, persistence, and SDK effects inside repository or infrastructure adapters.

```ts
// valid: entity repository adapter
// src/entities/order/repository/order.repository.ts
export const loadOrder = () => fetch('/api/order')

// invalid: domain model performs I/O
// src/entities/order/model/order.model.ts
export const loadOrder = () => fetch('/api/order')
```

Configure effect packages, globals, and constructors under `effects` in `jst.config.ts`.
