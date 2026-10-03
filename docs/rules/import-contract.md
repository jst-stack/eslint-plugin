# `jst/import-contract`

Enforces configured layer direction, sibling-slice isolation, state ownership, and `<slice>.public.ts` entry points.

```ts
// valid: features consume an entity public API
import { Order } from '@/entities/order/order.public'

// invalid: private entity implementation and upward dependency
import { Order } from '@/entities/order/model/order.model'
import { CheckoutPage } from '@/pages/checkout/checkout.public'
```

Configure `imports` in `jst.config.ts`. Tests are excluded from production direction checks.
