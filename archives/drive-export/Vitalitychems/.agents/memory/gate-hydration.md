---
name: Pre-hydration age-gate state
description: Keep early script acceptance synchronized with React modal state.
---
An age gate that accepts clicks before hydration must communicate acceptance to React, not merely hide the overlay or remove DOM attributes.

**Why:** A pre-hydration capture handler can prevent the React click handler from firing. The hidden dialog then retains its focus trap and stale blocking state. Browser storage can also be unavailable.

**How to apply:** Keep session acceptance independent of storage, synchronize early acceptance with hydrated state, and release focus traps and background inertness together. Check auth-route exemptions separately from actual acceptance.

## Server-consistent initial state (added 2026-09-15)
Never read the boot script's `data-gate` attribute inside a `useState` initializer. Derive the initial open state from the route alone (identical on server and client) and apply acceptance in the mount effect.

**Why:** Reading `data-gate` on the client produced `inert={false}` against server HTML with `inert=""`. React logs the mismatch and does not patch it, so an already-accepted session that did a full load (reload, return from Stripe) kept the whole storefront inert in dev while looking fine.

**How to apply:** Any SSR'd component that mirrors a pre-hydration DOM mutation must start from the server value and converge in an effect. Verify with a fresh context and a reload, checking both the console and `document.getElementById("ruo-wrapper").inert`.
