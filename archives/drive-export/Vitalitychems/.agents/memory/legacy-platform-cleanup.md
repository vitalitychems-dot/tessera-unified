---
name: Legacy platform scaffolding
description: Why the imported repo's old-platform scaffolding was removed, what stays on purpose, and rules that keep it from creeping back.
---

# Imported-from-elsewhere scaffolding

The GitHub import carried another hosting platform's scaffolding (a "grok" preview
bridge, PWA install page, app-env flag plumbing, an embedded PGLite fallback DB, and an
unused shadcn tree). It was removed on 2026-09-14; do not re-import it from the upstream
repo if the user re-syncs from GitHub.

**Kept on purpose (do not "clean up"):**
- Admin tab id `grok` ("Merch optimizer") and `grok_*` DB columns — renaming is a broad
  refactor with no user value.
- Legacy bearer-token key cleanup in the auth client.

**Rules now in force:**
- `DATABASE_URL` is mandatory; there is deliberately no embedded/in-memory fallback.
  **Why:** the silent fallback hid a missing DB during a previous debugging session.
- One process-wide pg pool (`db-pool.server.ts`) is shared with Better Auth. **Why:**
  two default pools per process exceeded hosted-Postgres connection limits.
- OG/Twitter tags come only from `seoHead()`; adding them in the root layout again
  produces duplicate tags.
- Bearer-token auth is a fallback for the embedded workspace preview only (iframe →
  partitioned cookies); deployed top-level traffic must stay cookie-only.
- Support tickets (COA requests) never go into `store_subscribers` — that table is the
  consent-based newsletter list (unique per email, gets welcome/broadcast mail).
