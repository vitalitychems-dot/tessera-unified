# Checkout operations

Zelle and Bitcoin are manual payment methods. Configure their recipient details in the admin payment settings. Customer claims do not settle an order; an administrator must verify funds and mark it paid.

Bitcoin rates come from Coinbase, expire after 30 minutes, and never use a fallback rate. Keep the configured address under operational control and independently verify transaction IDs before settlement.

## Enable Stripe

1. Connect Stripe in the Replit Integrations tab.
2. In the development environment, from `artifacts/vitality-supply`, run
   `NODE_ENV=development pnpm exec tsx scripts/stripe/seed-products.ts`. The script
   refuses production, requires the Replit Stripe sandbox, runs StripeSync
   migrations, creates the managed webhook at `/api/stripe/webhook`, creates
   missing catalog products/prices, and runs `syncBackfill({ object: "all" })`.
3. The connector's managed webhook is the signing-secret source; a connection-level
   webhook secret is optional. The app now keeps Card disabled until the schema,
   managed webhook, and backfill are ready.

When Stripe is disconnected, card checkout is explicitly disabled; no Stripe work runs at application startup.

## Remaining sandbox E2E steps

These checks use Stripe's development sandbox only and do not create live charges
or refunds. They require the authorized Replit Stripe connection, `DATABASE_URL`,
and `REPLIT_DOMAINS`; no API key is pasted into the shell or chat.

1. Run the seed command above and confirm it completes without a missing-price or
   webhook error.
2. Open checkout with a cart containing one or more existing vial SKUs. Confirm
   the multi-vial tier buttons add only the displayed quantity and that the
   server quote updates merchandise, bulk savings, shipping, credit, and total.
3. Select Card and use Stripe's documented test PaymentMethods for a successful
   card, a declined card, and a cancelled Checkout Session. Confirm the order
   reference, return URL, and unpaid/paid state match the result.
4. Send/replay the resulting sandbox webhook from the Stripe Dashboard and
   confirm duplicate delivery is harmless and the order settles once. If the
   hosted test page remains in Processing, retrieve the sandbox Checkout Session
   in the Dashboard and use the order-page reconciliation path.
5. Repeat the successful flow with the same browser idempotency key only through
   a controlled retry, then verify no second order is created. Keep refunds,
   disputes, and any live-mode operations out of this test.