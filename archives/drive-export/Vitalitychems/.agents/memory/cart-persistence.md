---
name: Cart persistence verification
description: Persisted cart migrations need storage-level verification, not just rendered totals.
---
Verify stale-cart recovery both in rendered state and in saved browser storage.

**Why:** A Zustand hydration merge can sanitize the visible cart without writing the cleaned result back, causing repeated cleanup on reload.

**How to apply:** Test two successive hydrations with a removed SKU and a valid SKU; the valid item must remain and the removal notice must not repeat. Node tests of Zustand persistence need window.localStorage available before importing the store.

## Cart-dependent pages need a hydration gate (added 2026-09-15)
The store uses `skipHydration` and rehydrates in a root effect, so the server (and first client render) always see an empty cart. Checkout server-rendered "Your cart is empty" until hydration finished — several seconds in dev — which testers reported twice as "cart lost on reload". Checkout now renders a loading state until `useCartHydrated()` is true.

**Why:** Zustand only reports `hasHydrated()` after a successful read; a throwing storage (Chrome with cookies blocked, corrupted JSON) never resolves it, and zustand omits `persist` entirely when storage access throws. Hydration is therefore tracked as "attempt settled" in a `finally`, and `hydrateCart()` tolerates a missing persist API.

**How to apply:** Any page whose empty state depends on the persisted cart must gate on hydration, and browser tests must wait for the loading heading to disappear before judging. Do not trust an "empty cart" screenshot taken right after `reload()`.
