---
name: Build and browser-check gotchas
description: Tooling behaviors in this workspace that waste time when forgotten.
---
- Do not pipe `pnpm run build` through `head`: the closed pipe kills the Nitro build mid-way and it looks like a failure. Redirect to a log file and tail it.
- A headless Chromium is available at `/repl/tools/bin/chromium`; driving it over CDP (`--remote-debugging-port`, `Runtime.evaluate`) is a fast way to check hydration warnings, `inert`, localStorage and sessionStorage state without the testing subagent. Pick the `type: "page"` target, not the extension background page.
- Dev-server hydration takes several seconds; a screenshot taken right after `reload()` shows server HTML, not the app state. Poll for the loading state to disappear first.
- The newsletter popup fires 15 s after load on every page except checkout/order/auth routes and appears above everything (z-90); it can block element-hit tests that run longer than 15 s.
- After SEO schema changes, run the full regression suite: tests can preserve an old “schema absent” assumption even when the new structured data is correct.
- Client-facing RPCs must live in a non-`.server` wrapper and dynamically import server-only implementations; importing a `.server` module through a shared client API fails the production bundle protection.
