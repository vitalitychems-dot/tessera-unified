---
name: Storefront browser-testing gotchas
description: What trips up automated browser/DB checks of this storefront and what to clean up after a test run.
---

# Browser-testing this storefront

- The age gate appears on every fresh load by design; testers must click through each time,
  and it can overlay screenshots even when the page underneath is correct.
- Below-the-fold product images are `loading="lazy"` — `naturalWidth === 0` before scrolling
  is not a broken image. Verify the file serves 200 instead.
- The default home tab is "Top sellers" (8 SKUs); "Vials" legitimately shows all 48 vial SKUs.
- Emails are stored lower-cased; a mixed-case `email = '...'` lookup returns nothing.
- Staff login: the tester can read the password from the `ADMIN_PASSWORD` env var in its
  shell — pass it that way, never paste it.
- **Clean up after a run:** testers that exercise Admin → Payments save placeholder Zelle /
  Bitcoin destinations into `store_settings` (`zelle_recipient`, `zelle_display_name`,
  `btc_address`). Delete those rows afterwards, otherwise checkout advertises a payment
  destination the owner does not control. Remove test promo codes from `promo_codes` too.

**Why:** a test run once left the public BIP-173 example bitcoin address configured as the
store's payout address.
