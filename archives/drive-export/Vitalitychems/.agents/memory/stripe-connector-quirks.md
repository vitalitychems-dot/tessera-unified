---
name: Stripe connector + stripe-replit-sync quirks
description: Non-obvious behaviour of the Replit Stripe connection and stripe-replit-sync that cost time on this storefront.
---

# Stripe connector / stripe-replit-sync quirks

- The Replit-provisioned Stripe sandbox connection returns `settings.secret` and
  `settings.publishable` (plus `account_id`, `claim_url`), not the `secret_key` /
  `webhook_secret` names in the skill template. Read both shapes.
- There is no connection-level webhook secret. `processWebhook` falls back to the secret
  stored in `stripe._managed_webhooks` for the account, so `findOrCreateManagedWebhook`
  must have run first (do it in a per-process bootstrap, not only in a seed script —
  seed scripts cannot run in deployments).
- `syncBackfill()` with no argument syncs nothing (its default `object` is a function
  reference that matches no switch case). Always pass `{ object: "all" }`.
- In the workspace, Stripe sandbox events sat at `pending_webhooks=1` for many minutes with
  no delivery to the dev domain even though the URL was reachable externally. Do not make
  order settlement depend on the webhook: reconcile from the order page (ask Stripe about the
  session while unpaid) and from the staff orders list.
- Headless-browser test runs may hang on Stripe's hosted "Processing" state and never hit
  the success URL; check `checkout.sessions.retrieve` to see whether the charge succeeded.
- Payment adjustment records must reference the durable internal webhook-ledger event id, not
  the Stripe object id; replay identity and the audit trail depend on that distinction.

**Why:** the first live card test paid successfully in Stripe but the order stayed unpaid
because neither the redirect nor the webhook arrived.

**How to apply:** any new Stripe-settled flow (subscriptions, invoices) needs its own
pull-based reconciliation alongside the webhook.
