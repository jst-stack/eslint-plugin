# `jst/ui-contract`

Keeps `*.component.tsx` modules props-driven: no async orchestration, state-manager imports, aggregation, or combinations of boolean variant props.

```tsx
// valid
export function OrderList({ items, onSelect }: OrderListProps) {
  return items.map(item => <button onClick={() => onSelect(item.id)}>{item.name}</button>)
}

// invalid: async orchestration belongs in an entry/store/service
export async function OrderList() {
  return fetch('/api/orders')
}
```

Configure state packages, calculation methods, and variant names under `ui` in `jst.config.ts`.
