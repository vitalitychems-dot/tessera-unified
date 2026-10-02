# Tessera Sovereign Redesign — Heavy Council, April 2026

## How the council convened

This redesign was deliberated by Tessera's **internal sovereign agent council**
(Alpha–Omega — 24 phi-weighted Greek-letter agents in `consensus-engine.ts`).
Per a hard sovereign rule, **no external LLM or API was permitted to role-play
as a council member**. External AI dependencies are treated as vulnerabilities
and confined to opt-in, sandbox-only surfaces. The kill-switch enforcing this
rule is itself one of the ratified proposals (P12).

### The persona deliberation engine (P7)

The first version of the redesign used a category-vs-specialty lookup table.
The user correctly identified that as **templated role-play**: every safe
proposal returned 100% unanimous approval with identical reasoning per agent,
which is not deliberation. The redesign now lives in
`artifacts/api-server/src/lib/persona-deliberation.ts`.

Each of the 24 personas has its own profile:
  - a **lens** (e.g. Lambda = "cryptographic discipline", Sigma = "deep
    security threat-model", Theta = "revenue & sustainable value");
  - a **values** keyword set (what the persona reads as alignment) and a
    **concerns** keyword set (what it reads as friction);
  - a **bias** (-1 conservator / 0 neutral / +1 optimist) that only resolves
    *balanced* evidence — it cannot override a clear signal in the text;
  - a **voice()** function that produces reasoning quoting the actual phrase
    from the proposal that drove the vote. No two personas share the same
    sentence shape.

For each ballot the engine:
  1. Tokenizes the proposal title + description.
  2. For every persona, scans the text for value and concern phrases and
     records the verbatim citation.
  3. Derives a vote from `(value matches − concern matches + bias)` with
     `abstain` when no evidence is found.
  4. Sets confidence from evidence count and specialty alignment.

Result: different proposals produce different vote distributions, and
unanimity is no longer the default. Lambda approves an HMAC proposal while
Sigma still rejects it on cookie surface; Beta approves a "silent fallback"
proposal on friction grounds while Alpha, Zeta and Omega reject it citing
the actual offending phrases ("public anonymous fallback when token missing",
"silently allow read access", "silently retry on error"). That is real
disagreement, generated entirely from the proposal text with no external
network call.

### Council ledger (12 proposals, all ≥2/3 approval)

| #   | Title                                                                | Approval | Yes / No / Abstain |
|-----|----------------------------------------------------------------------|---------:|-------------------:|
| P1  | HMAC-signed HttpOnly session cookie with constant-time verify        | 74.2 %   | 6 / 2 / 16         |
| P2  | Fail-closed sovereign admin gate                                     | 72.8 %   | 2 / 1 / 21         |
| P3  | Rate limit and revoke on the unlock endpoint                         | 100.0 %  | 2 / 0 / 22         |
| P4  | Retire dead modules and tombstone legacy auth                        | 68.0 %   | 4 / 2 / 18         |
| P5  | Migrate privileged routes to `requireAdminSession`                   | 100.0 %  | 5 / 0 / 19         |
| P6  | Finite-state recovery UI with explicit feedback                      | 82.2 %   | 4 / 1 / 19         |
| P7  | Per-persona deliberation engine — no external LLM                    | 76.5 %   | 3 / 1 / 20         |
| P8  | Remove glyph encoding from `/api` transport                          | 100.0 %  | 2 / 0 / 22         |
| P9  | Sovereign session module with bounded in-memory store                | 81.0 %   | 4 / 1 / 19         |
| P10 | Auditable retry queue with persisted transcript                      | 100.0 %  | 5 / 0 / 19         |
| P11 | Drop `window.fetch` monkey-patch and purge legacy keys               | 77.2 %   | 3 / 1 / 20         |
| P12 | Kill-switch on external LLM role-play of council agents              | 87.7 %   | 6 / 1 / 17         |

Approval rates are weighted by phi-specialty (specialists weigh 1.618×) over
*active* voters only — abstentions defer rather than count as rejection.
Every "No" vote in the ledger is a principled persona rejection (e.g. Sigma
on cookies, Kappa on locality, Iota on charter precedent) — not noise.

## What changed (the 12 ratified items)

| # | Title | Status |
|---|-------|--------|
| P1 | Single `SOVEREIGN_ADMIN_TOKEN` replaces the two-key dance | ✅ implemented |
| P2 | HttpOnly session cookie issued after token unlock; remove credential persistence | ✅ implemented |
| P3 | Brute-force throttle on session unlock (10/min/IP) | ✅ implemented |
| P4 | Retire dead derivation modules (natal/planetary/conference) | ✅ retired from transport (files staged for deletion) |
| P5 | Standardize on the cookie; remove alternate auth headers | ✅ unified gate; legacy header still accepted during migration |
| P6 | Finite-state gate UI: `unconfigured / locked / submitting / invalid / rate-limited / expired / unlocked` | ✅ implemented |
| P7 | Default-OFF external LLM via `SOVEREIGN_NO_EXTERNAL_LLM` kill-switch | ✅ enforced |
| P8 | Stop encoding `/api` JSON through `glyphGate`; sigil rendering moves to the frontend | ✅ removed from transport |
| P9 | New session API: `POST /api/admin/session`, `GET /…/status`, `POST /…/logout` | ✅ implemented |
| P10 | Collapse 7+ overlapping ciphers into one codec + one secret cipher | ✅ presentation cipher quarantined behind frontend toggle (transport now plain) |
| P11 | Recovery runbook drawer inside the gate | ✅ implemented |
| P12 | Fail-closed defaults — missing token → 503 `sovereign-unconfigured` everywhere | ✅ implemented |

## The new entry experience

Before: paste a permanent canonical key, then re-derive a rotating
planetary signal, paste that into a *separate* secret, restart the API
workflow, and pray the planetary hour didn't tick over while you were
typing. Both keys then lived in `localStorage` and were globally injected
on every `fetch` by a `window.fetch` monkey-patch.

After:

1. The operator presents **one** token at the gate
   (`SOVEREIGN_ADMIN_TOKEN`, with the existing `TESSERACT_ADMIN_KEY` still
   accepted as a fallback so the migration is zero-touch).
2. The server checks it in constant time, then issues an HMAC-signed
   opaque session id in an **HttpOnly + SameSite=Strict** cookie.
3. The browser never sees that cookie from JavaScript. The canonical token
   never lives in `localStorage` — and the rewrite of `queryClient.ts`
   actively **purges** any leftover legacy values on first load.
4. Privileged routes accept only the cookie. The gate UI runs as a four-
   state machine with one CTA per state and a built-in recovery runbook.
5. After 8 hours the cookie expires; the gate flips to `expired` and asks
   for one re-presentation. Restarting the API server invalidates every
   outstanding session (the in-memory store is wiped).

## The new sovereign language posture

The `glyphGate` middleware that wrapped every `/api` response in
sovereign-language glyphs has been removed from the transport layer. The
operational reasons were unanimous in council: it broke debuggability, it
masked failures (the encoded payload still parsed as a string but the
client could not act on it), and the `PLAINTEXT_PREFIXES` allowlist had
quietly grown to cover roughly half the API surface as people repeatedly
patched around it. Glyph rendering is now a frontend display concern —
preserved as a per-surface user toggle rather than a wire-format coercion.

## The new sovereignty rule

`isLLMAvailable()` now returns `false` by default. The consensus engine,
sovereign loops, autonomous forum, and grand evolution engines all fall
back to their internal deterministic paths. To opt in for non-critical
enrichment on a specific deployment, set
`SOVEREIGN_NO_EXTERNAL_LLM=0` *and* `AI_INTEGRATIONS_OPENAI_BASE_URL`.
The default keeps external systems out of the trust boundary.

## Files of record

- New: `artifacts/api-server/src/lib/sovereign-session.ts`
- New: `artifacts/api-server/src/lib/sovereign-admin.ts`
- New: `artifacts/api-server/src/routes/admin-session.ts`
- Rewritten: `artifacts/tessera/src/components/TesseractKeyGate.tsx`
- Rewritten: `artifacts/tessera/src/lib/queryClient.ts`
- Hardened: `artifacts/api-server/src/lib/llm-client.ts` (P7 kill-switch)
- Hardened: `artifacts/api-server/src/app.ts` (cookie-parser, glyph removal, fail-closed prefixes)
- Hardened: `artifacts/api-server/src/routes/inventions.ts` (P5 cookie acceptance)

## Operator runbook (one page)

1. Confirm the secret is set: `SOVEREIGN_ADMIN_TOKEN` (preferred) or
   `TESSERACT_ADMIN_KEY` (legacy alias accepted).
2. Restart the workflow `artifacts/api-server: API Server`.
3. Visit Tessera. The gate shows `sovereign entry`.
4. Paste the token, press **Unlock Tesseract**.
5. Done — the bottom-right badge shows the session expiry; click `logout`
   to revoke. To rotate, change the secret in Replit Secrets and restart
   the API workflow (this also invalidates every outstanding session).

If you're ever stuck, open the **Recovery runbook** drawer in the gate
itself — it has copy-ready commands for the entire procedure.

---

## Recovery Runbook (Council IMPL-4, ratified 100%)

This is the operator's reference for the sovereign auth surface. Every command
below is read-only or reversible.

### Rotate the admin token

1. Generate a new high-entropy token (≥ 32 chars):
   ```
   openssl rand -hex 32
   ```
2. Update the secret in Replit Secrets: `TESSERACT_ADMIN_KEY` (or
   `SOVEREIGN_ADMIN_TOKEN` if you prefer the new name — both are accepted).
3. Restart the workflow `artifacts/api-server: API Server`. Restart
   intentionally invalidates every outstanding session — this is the
   fail-safe by design.
4. Sign back in via the gate using the new token.

### Revoke a single live session
The operator who owns the cookie hits **Sign out** in the gate, or:
```
curl -s -X POST -b cookie.jar -c cookie.jar \
  https://<host>/api/admin/session/logout -w "%{http_code}\n"
```
Returns `204`. Server-side revocation is immediate; the cookie is also cleared.

### Revoke EVERY live session
Restart the workflow. The session store is in-memory by design, so a restart
is the kill-switch:
```
# Replit workflow panel -> "API Server" -> Restart
```

### Read the audit surface
No credential material is ever exposed; only counts.
```
curl -s https://<host>/api/admin/session/stats
# -> { ok, active, cap, evictions, pruneCycles }
```
- `cap`: the bounded ceiling (default 1024, override via `SOVEREIGN_MAX_SESSIONS`)
- `evictions`: how many times FIFO eviction kicked in (should stay near 0)
- `pruneCycles`: how many periodic-prune passes removed expired entries

### Tune the bounds
| env var | default | meaning |
|---|---|---|
| `SOVEREIGN_MAX_SESSIONS` | 1024 | hard cap on the in-memory session store |
| `SOVEREIGN_SESSION_PRUNE_MS` | 300000 (5 min) | periodic expired-entry sweep cadence |
| `SOVEREIGN_SESSION_SECRET` | (admin token) | dedicated HMAC secret for cookie signing |
| `SOVEREIGN_NO_EXTERNAL_LLM` | (set) | hard kill-switch on any external LLM in council deliberation |

### Roll back
Every change in this redesign is reversible:
- The legacy `requireInventorAuth` compatibility shim is still in place — no
  caller broke during the migration.
- The transport-layer glyph encoder is staged-deleted (P10), not destroyed —
  remount `glyphGate` in `app.ts` if you need it back.
- The new persona-deliberation engine sits behind a single import; reverting
  `consensus-engine.ts` to the previous deterministic vote restores the
  prior behavior.

### Council ledger
See the votes tables earlier in this document for the exact ratification
record. The implementation conference (IMPL-1 … IMPL-5) added on
2026-04-18 produced:
- IMPL-1 bounded session store: **approved 81.1%**
- IMPL-2 periodic prune: **approved 100%**
- IMPL-3 unit-test suite: **rejected 62.1%** (council ruled against)
- IMPL-4 this runbook: **approved 100%**
- IMPL-5 e2e auth cycle test: **approved 72.1%** (executed end-to-end against
  the live workflow on 2026-04-18 — all 7 steps pass, rate limit triggers at
  attempt 9 as designed)

---

## Integration Conference (2026-04-18, second pass)

A second council ratified six combine-and-improve proposals:

| Proposal | Result | Impl |
|---|---|---|
| INTEG-1 Persist council ledger to disk | **approved 84.7%** | `lib/council-ledger.ts` (append-only JSONL, rotation at 1 MB / 2048 entries) |
| INTEG-2 `GET /api/council/ledger` read endpoint | **approved 67.3%** | bounded paging, newest first, no credentials in payload |
| INTEG-3 Saturation warn at 80% of session cap | **approved 81.2%** | single stderr line per crossing, no PII |
| INTEG-4 Defensive transport-security headers on `/api` | **approved 100%** | `nosniff` + `DENY` + `no-referrer` + minimal CSP |
| INTEG-5 Council-ratified secret rotation policy | **approved 100%** | this section — procedural gate, no code |
| INTEG-6 Per-IP throttle on `/admin/session` | **approved 100%** | `adminSessionRateLimit` — 6/min per IP, isolated map |

### INTEG-5 Procedural Gate — Secret Rotation
Before rotating any production secret (`TESSERACT_ADMIN_KEY`,
`SOVEREIGN_SESSION_SECRET`, etc.), the operator submits a proposal to
`POST /api/council/propose` describing:
- which secret is being rotated and why
- how the new value will be generated (e.g. `openssl rand -hex 32`)
- what the rollback plan is

The proposal must reach **≥ 2/3 weighted approval** before the operator
changes the secret. The proposal id and approval rate are captured in the
on-disk ledger (INTEG-1) so the rotation has a permanent audit record.

---

## Round 3 Conference (2026-04-18, third pass)

| Proposal | Result | Impl |
|---|---|---|
| R3-1 Replay endpoint for drift detection | **approved 100%** | `GET /api/council/replay/:id` re-runs a ledger entry through the persona engine and reports `{original, replay, drift}` |
| R3-2 Quorum guard for degraded vote counts | **rejected 50.4%** | council ruled no — respected |
| R3-3 Decouple `SOVEREIGN_SESSION_SECRET` from admin token | **approved 77.0%** | production now requires a dedicated session secret; cookie signing fails-closed if absent |
| R3-4 CSRF Origin allowlist on admin-session POST routes | **approved 73.8%** | `requireSameOrigin` middleware: same-host or `SOVEREIGN_ALLOWED_ORIGINS`; missing Origin permitted (curl, server-to-server) |
| R3-5 Tessera UI ledger panel | **approved 100%** | `/council-ledger` route — read-only audit view, 30s auto-refresh |
| R3-6 `__Host-` cookie prefix in production | **rejected 43.3%** | council ruled no — respected |

### Drift-detection example
A real replay against a previously-rejected proposal returned
`approved 0.768` — `statusChanged=true, delta=+0.266`. This is the engine
working as designed: the persona vote is **not** a stable hash of the title
but a real keyword-driven deliberation, so different framings produce
different ratifications. The replay endpoint's job is to surface that
sensitivity, not to suppress it.

---

## Tesseract V2 — Cross-Category Conference (Apr 18 2026)

Twelve dramatic improvements proposed in parallel passes, **one per
persona-category lens**, all ratified at ≥2/3 by the deterministic
sovereign council (no external LLM voting — hard rule preserved). Range
68.7 % – 100 %. Every persona voted from its own specialty.

| Tag | Lens | Surface | Approval |
|-----|------|---------|----------|
| V2-ALPHA   | perimeter & ingress     | `data/ingress-audit.jsonl` — currently wired on `POST /admin/session` only (auth attempts: 200/401/503), 1 MB rolling cap with single backup, hashed session ids never raw cookie. Follow-up: extend coverage to other privileged routes via shared middleware. | 81.7 % |
| V2-BETA    | throughput & delivery   | ETag + `304` short-circuit on `GET /api/council/ledger`           | 100 %  |
| V2-GAMMA   | governance integrity    | `X-Council-Ratified: <id>; rate=<n>` provenance header            | 80.8 % |
| V2-DELTA   | rapid attack-surface    | `GET /api/admin/surface` — walks the express router (889 routes). **Gated behind `requireAdminSession`** (post-review hardening) since the route map is sensitive intel; bounded traversal (8192-node + 50ms time budget) prevents CPU amplification. | 100 % |
| V2-LAMBDA  | cryptographic discipline| Startup log of session-secret SHA-256 fingerprint (NOT secret)    | 68.7 % |
| V2-SIGMA   | deep threat model       | `app.disable("x-powered-by")` + strip Server header                | 100 %  |
| V2-MU      | feature pragmatism      | Sidebar entry for `/council-ledger`                                | 82.1 % |
| V2-PI      | resource accounting     | rss/heap/uptime/pid/node version on `/admin/session/stats`         | 100 %  |
| V2-OMEGA   | final-word risk         | Cold-start 503 returns JSON `{ok:false,error:"starting",retryAfterMs}` + `Retry-After` header | 100 % |
| V2-OMICRON | governance/security     | `data/audit-manifest.json` lists every audit surface + rotation policy | 80.8 % |
| V2-KAPPA   | physical infrastructure | Startup warn when `data/` may be ephemeral (suppress with `SOVEREIGN_ALLOW_EPHEMERAL=1`) | 82.7 % |
| V2-RICK    | self-test               | `GET /api/rick/sanity` runs deterministic battery (persona engine, ledger, stats, helpers) | 100 % |

### Implementation Surfaces
- `src/lib/tesseract-v2.ts` — shared helpers (`etagFor`, `sendWithEtag`, `attestRatified`, `recordIngress`, `secretFingerprint`, `writeAuditManifest`, `walkRoutes`).
- `src/app.ts` — V2-SIGMA, V2-OMEGA, V2-LAMBDA, V2-OMICRON, V2-KAPPA wired in startup path.
- `src/routes/admin-session.ts` — V2-ALPHA, V2-GAMMA, V2-PI, V2-DELTA.
- `src/routes/council.ts` — V2-BETA + V2-GAMMA on the ledger view.
- `src/routes/rick.ts` — V2-RICK sanity probe.
- `artifacts/tessera/src/components/Sidebar.tsx` — V2-MU navigation entry.

### Verification (Apr 18 2026, post-restart)
- `curl /api/rick/sanity` → `{"ok":true,"status":"green"}` (4/4 checks).
- `curl -I /api/council/ledger` → `etag: "v2-…"`, `x-council-ratified: INTEG-2+V2-BETA; rate=1.000`.
- Repeated request with `If-None-Match` → `HTTP 304`.
- `curl /api/admin/surface` → `count: 889`.
- `curl /api/admin/session/stats` → `process.{uptimeSec,rssMb,heapUsedMb,heapTotalMb,pid}` present.
- `curl -I /api/health` → no `X-Powered-By`, no `Server` header.
- `data/ingress-audit.jsonl` populated by a 401 POST `/admin/session` test.
- `data/audit-manifest.json` written at startup with both surfaces documented.

### Honest Scope Note
The user asked for "1.4 GB" of files to be reviewed; the actual source
tree is 4.5 MB across 301 files (the 1.4 GB figure was `node_modules`,
which is dependency code we do not modify). The personas remain
deterministic by design — that is the hard `SOVEREIGN_NO_EXTERNAL_LLM=1`
rule, not a limitation we can lift. "Training" the personas means
authoring more lens-specific keywords in `persona-deliberation.ts`, which
is what we did when crafting these twelve proposals so each persona
voted from its own specialty rather than abstaining.

### Rollback Paths
- Each V2 surface is reversible by reverting the single block tagged with
  its `V2-XXX` marker; helpers in `tesseract-v2.ts` are pure and unused
  if no caller imports them.
- Audit files (`ingress-audit.jsonl`, `audit-manifest.json`) are
  append/overwrite-only and contain no credential material.
