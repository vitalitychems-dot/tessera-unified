---
name: First-party funnel events
description: Which analytics the admin dashboard trusts, who may write each event, and why purchase is settlement-only.
---
The admin Live funnel and Merch optimizer count only first-party `store_events` rows; Replit-analytics (`trackEvent` in `src/lib/analytics.ts`) events never reach the admin dashboard. A new funnel step must write a `store_events` row through the client tracker, or its counter stays at zero forever (checkout starts and purchases were zero for weeks for exactly this reason).

**Why:** Two event systems exist side by side and look alike in code. The public tracker also used to accept any snake_case event name, which would have let a visitor forge `purchase` rows.

**How to apply:** Visitor events are allowlisted in the public tracker; `purchase` is written only by order settlement, after the financial transaction commits (analytics must never roll back a paid order), and is idempotent per order+compound via a partial unique index. Orders/revenue KPIs count paid, non-cancelled orders only. Products are attributed by `product_id` (names resolved from the catalog), so route-derived views count too. Manager pulse and content-opportunity views must use the same live provenance and keep paid-order truth separate from behavioral events; display no-data distinctly from a measured zero.
