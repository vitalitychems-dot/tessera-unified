# Validation report — Tessera Unified

**Checked:** 2026-10-02, against the current local tree before the next public push.

## Environment and dependency checks

- Validation ran on Node.js 22.13.0 with pnpm 11.25.0. The root `packageManager` pin and the GitHub Actions workflow use pnpm 11.25.0; CI targets Node.js 22.
- `pnpm install --frozen-lockfile --ignore-scripts` completed for all 11 workspace packages. The legacy storefront's Better Auth/TanStack compatibility pins remain in place. The API uses `uuid`'s bundled TypeScript declarations; the redundant deprecated `@types/uuid` stub was removed.
- Full-tree `pnpm audit` is clean: **0 info, 0 low, 0 moderate, 0 high, 0 critical advisories**. The initial full audit had 63 advisories; lockfile/direct dependency remediation and explicit patched floors reduced it to zero. A full audit, not only production dependencies, was used.
- The `.github/workflows/ci.yml` file parses as YAML and contains push/PR checks with read-only `contents` permission. GitHub-hosted CI has been configured but has not yet run on GitHub.

## Build, test, and runtime checks

- `pnpm run typecheck` passed across libraries and app packages.
- `pnpm run build` passed for the active workspace apps, including Tessera web/API, Vitality Supply, the earlier storefront, and UI preview. No database migrations were run by the build.
- `pnpm test` passed with zero failures: suite-policy tests **6 passed**; Vitality Supply **87 passed / 8 skipped**; Vitality Chems storefront **250 passed**; Tessera API **94 passed / 1 skipped**. Total: **437 passed / 9 skipped**.
- Database-backed API tests used a fresh disposable sandbox-local PostgreSQL database and a synthetic chart fixture. The runner received the dedicated `TESSERA_TEST_DATABASE_URL`; it did not reuse an app `DATABASE_URL` or production records.
- A clean `pnpm dev` smoke test started the four user-facing apps. Each returned HTTP 200 on ports 3000, 4173, 8080, and 5173. The API remained opt-in and was skipped because no loopback `DATABASE_URL` was configured. The temporary smoke-test processes were stopped and the ports were verified clear.
- Non-blocking build/dependency warnings remain: Vite reports large client chunks (the largest is about 1 MB) and the legacy Vite/Nitro build warns that module-level `use client` directives may not be preserved. Some upstream packages also emit deprecation notices; these are not current `pnpm audit` advisories and did not fail tests or builds.

## Redundancy and image-text checks

- The SHA-256 audit records 52 shared UI components and 160 repeated-store path links (147 duplicate image contents, eight SQL migrations, and five identical utility modules). Fourteen byte-identical handoff copies were removed.
- No broken symlinks were found. Six groups of duplicate regular-file content are deliberately retained for standalone licenses/source notices, editable templates, structural markers, and app-local TypeScript configs; reasons are in [`redundancy-ledger.csv`](redundancy-ledger.csv).
- OCR covers **494 unique image contents**: 466 yielded text, 17 had no confident text, six personal-record-indicator images were omitted, five small decorative images were skipped, and 98 line/item occurrences were redacted. The new 5t branch sync screenshot is represented as sanitized OCR text and a source hash; its raw image was not copied. OCR is lossy and should not be treated as authoritative.

## Credential and privacy checks

- A value-redacted high-confidence scan found no GitHub/AWS/Stripe/OpenAI/Google/Slack token patterns or private-key headers. Thirteen generic key-assignment matches were classified as environment/example placeholders; no candidate values were printed. This is a pattern scan, not a guarantee that historical credentials have been purged.
- `.env.example` values are blank; populated environment files and common key/credential files are ignored. `.env.local` is not tracked.
- Existing public business-contact fields remain unchanged as previously approved; they are not runtime keys. Rotate any credential that may have appeared in older public source or history.
- Browser profile/session data, runtime databases, unreviewed user-pasted content, path-level personal-media inventories, and protected `1T` vault content were not staged.

## Source scope and limits

The current default-branch deltas, non-main branches, and three open unreviewed `Grok-ready` PRs are enumerated in [`SOURCE-BRANCH-REVIEW.md`](SOURCE-BRANCH-REVIEW.md). They are not claimed as integrated; the source repositories remain unchanged and undeleted pending the owner's decision. The protected `1T` repository remains uninspected. Validation does not cover every historical branch, external deployment, credential store, fork, cache, or prior public history.
