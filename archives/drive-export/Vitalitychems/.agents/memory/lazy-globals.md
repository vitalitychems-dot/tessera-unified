---
name: Lazy global UI must not look dead
description: Deferred-mount chunks (cart drawer, research desk) need idle preloading and an instant fallback or the first click appears to do nothing.
---
Global overlays are mounted on demand after the age gate to keep first paint light. The first open of such a chunk waited on a network round trip (over a second in the dev server), which testers and the owner read as "buttons don't work". Rule: preload the module on idle right after the gate is accepted, and render an instant placeholder while the chunk resolves.

**Why:** The owner's "static page / nothing clickable" report was mostly a stale published build, but the on-demand cart chunk added a real perceived-lag on first open even on the current build.

**How to apply:** Any new `lazy()` global that opens from a click gets the same treatment: idle preload after gate acceptance plus a Suspense fallback that reacts to the open state. Never measure interactivity only on a warm reload.

## Mount trigger must be the store, not a side-channel event (added 2026-09-15)
The deferred cart drawer used to mount only on a custom window event that the header button dispatched. Product-page and catalog add-to-cart called `openCart()` without that event, so the store said open while nothing rendered — an invisible "dead click". The mount trigger is now the store's `isOpen` flag.

**How to apply:** When a global is mounted on demand, subscribe to the same state that opens it. Never require callers to remember a second signal.
