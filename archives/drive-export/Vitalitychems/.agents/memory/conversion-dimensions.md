---
name: Conversion event dimensions
description: Durable storage boundary for first-party storefront telemetry dimensions.
---

The shared conversion contract's bounded visitor dimensions belong in their own nullable JSONB column on `store_events`; do not overload the legacy metadata field.

**Why:** The legacy metadata value is also used as the settlement purchase idempotency key and is joined by notification/reconciliation queries. Mixing behavioral dimensions into it could break duplicate protection or operational counts.

**How to apply:** Add new visitor dimensions only through the pure conversion contract and persist them separately. Keep settlement-authored purchase rows independent of browser dimensions.