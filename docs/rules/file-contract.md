# `jst/file-contract`

Enforces `<lowerCamelName>.<role>.<extension>`, configured role directories, slice names, and test suffixes.

```text
valid:   src/entities/order/model/order.model.ts
valid:   src/entities/order/__tests__/order.model.test.ts
invalid: src/entities/order/ui/Order.tsx
invalid: src/entities/order/ui/order.service.ts
```

Configure roles, directories, framework files, and test suffixes under `files` in `jst.config.ts`.
