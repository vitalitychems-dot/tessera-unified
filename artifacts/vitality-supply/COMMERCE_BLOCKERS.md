# Commerce launch blockers

## Current state

Vitality Supply now supports server-priced checkout. Zelle and Bitcoin orders
are live when staff configure recipient details. Both are manual flows:
customers may claim a payment, but only an administrator can verify funds and
settle the order.

Prices, promotions, bulk savings, shipping, credit application, and rewards are
recomputed from the catalog on the server. Bitcoin requires a current Coinbase
spot quote and fails explicitly if one cannot be obtained. Credits and
affiliate commissions settle idempotently only after confirmed payment.

## Required before enabling checkout

1. Connect the Replit Stripe integration. Card payment remains visibly disabled
   until connector credentials are available.
2. Run StripeSync migrations, managed-webhook setup/backfill, and the catalog
   seed documented in `docs/checkout.md`.
3. Complete end-to-end Stripe sandbox tests for successful, declined,
   asynchronous, cancelled, duplicate-webhook, and refund paths.
4. Establish staff procedures for independently verifying Zelle receipts and
   Bitcoin transaction IDs before marking manual orders paid.

Staff accounts must be provisioned through the configured authentication
administration flow. The storefront does not auto-create staff accounts.