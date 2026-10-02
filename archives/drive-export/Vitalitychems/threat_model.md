# Threat Model

## Project Overview

Vitality Chems (vitalitychems.com) is a research-compound storefront built with TanStack Start (React 19, file routes + server functions), Vite 7, Tailwind 4, served in production by Nitro's `node-server` preset on a public Replit autoscale deployment (`NODE_ENV=production`). Data lives in Postgres accessed through a single `pg` pool behind a tagged-template `sql` helper (`src/lib/db.ts`). Authentication is Better Auth (email/password) at `/api/auth/*`. Payments use Stripe (server-priced), Zelle, and BTC/ETH. There is a single staff account (`ADMIN_EMAIL`) and an admin console, plus an AI store manager and an autonomous organic-content engine.

Users: anonymous shoppers, registered/verified customers (with lab-credit rewards, referrals, wholesale), and one staff/admin operator.

## Assets

- **Customer accounts & sessions** — Better Auth credentials, session cookies/bearer tokens, verification state. Compromise enables impersonation and access to orders/credit.
- **Order & PII data** — shipping addresses, names, emails, phone, business email, keyed EIN fingerprint, order history.
- **Money-adjacent state** — store credit ledger/balances, referral/affiliate rewards, promo redemptions, order totals, Stripe sessions.
- **Application secrets** — `DATABASE_URL`, `SESSION_SECRET`/`BETTER_AUTH_SECRET`, `ADMIN_PASSWORD`, Stripe keys (via Replit connection), Resend/OpenAI/Coinbase access.
- **Content & analytics** — first-party `store_events` funnel, generated content pages, merch-rank/optimizer tables.

## Trust Boundaries

- **Browser → server functions** — every `createServerFn` call. `authMiddleware` (`src/lib/auth/middleware.ts`) is the chokepoint: it resolves the verified `context.userId`, forwards the bearer token in the preview iframe, and enforces Fetch-Metadata same-site isolation (`assertSameSiteRequest`). `optionalAuthMiddleware` permits guests.
- **Server → Postgres** — all queries parameterized via tagged-template `sql`; no raw interpolation observed.
- **Server → external services** — Stripe (signed webhook), Coinbase spot price (fixed URL), Resend, OpenAI (content/manager), IndexNow (fixed endpoint).
- **Public vs authenticated vs admin** — public: catalog, content, quotes, lead/COA/newsletter forms. Authenticated+verified: account, credit, business profile, order claiming. Admin: single `ADMIN_EMAIL` gated by `requireAdmin` (verified email + `isAdminEmail`).

## Scan Anchors

- Production entry points: `artifacts/vitality-supply/src/routes/**` and server functions in `src/lib/**` (checkout/api.ts, store-api.ts, credit-api.ts, manager-api.ts, newsletter/api.ts, analytics-event-api.ts, content/*-api.ts).
- Auth enforcement: `src/lib/auth/{middleware,verify.server,isolation.server,server,site-hosts.server}.ts`; admin gate `requireAdmin` in `src/lib/store-api.ts`.
- Highest-risk logic: checkout/credit/referral/promo (`src/lib/checkout/*`, `src/lib/promo*.ts`, `src/lib/payments/stripe.server.ts`), abuse limiter (`src/lib/public-abuse.server.ts`), AI manager (`src/lib/ai-manager.ts`, `manager-api.ts`), content engine (`src/lib/content/*`).
- Dev-only / ignore unless proven reachable: `artifacts/api-server` (template health route) and `artifacts/mockup-sandbox` (Canvas). Per replit.md the storefront does not use them.

## Threat Categories

### Spoofing / Improper Authentication
Better Auth requires verified email for sensitive actions; admin is a single provisioned account (`databaseHooks.user.create.before` blocks self-registration of `ADMIN_EMAIL`). Cookies are `SameSite=None; Partitioned` for the preview iframe; production trusts exact hostnames only. Stripe webhooks are signature-verified. Guarantee: every per-user/admin action must resolve identity via `authMiddleware` + `requireVerifiedUser`/`requireAdmin`, never a client-supplied id/email.

### Tampering
Prices are never trusted from the browser: checkout re-quotes server-side and validates Stripe `amount_total`/currency before and after session creation; manual payment refs are deduped; settlement is idempotent and transactional. Guarantee: all monetary math server-side; credit cannot exceed balance; promo/referral economics snapshotted at checkout.

### Information Disclosure
`loadOrder` scopes by `user_id` OR unguessable `access_key`; admin list endpoints select explicit non-secret columns (never password/EIN). AI manager refuses PII/individual-name outputs before any provider call. Guarantee: no cross-user/tenant data leakage; sensitive columns never crated into public order/response shapes.

### Denial of Service
Public form endpoints are rate-limited by a per-caller budget (`src/lib/public-abuse.server.ts`, keyed to an HMAC of the trusted-proxy-parsed client IP, with `/64` bucketing for IPv6) plus per-email/per-session limiters. The prior scan's weaknesses were remediated in baseline commit `0a166e5`: the shared global (`__global__`) budget was replaced with per-caller budgets, and `loadLiveMerch` is now a read-only `merch_rank` select (the expensive `store_events` aggregation and `merch_rank`/`grok_actions` writes moved into the admin-gated `loadAdminDashboard`). Guarantee: public endpoints that do expensive DB work must be authenticated, cached, or per-caller rate-limited.

### Elevation of Privilege / Business-Logic Abuse
Admin function-level authorization is consistently enforced across store, newsletter, checkout, manager, and content admin functions. The prior scan's referral-alias weakness was remediated in baseline commit `0a166e5`: referral/affiliate self-use and first-order/one-referral checks now compare `canonicalReferralEmail` (strips plus-address routing tags) under deterministic row locks, and first-order lookups normalize with `regexp_replace(email, '\+[^@]*@', '@')`. Guarantee: reward-granting flows must resist alias-based identity duplication.
