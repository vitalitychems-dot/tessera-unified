# Validation report — Tessera Unified

## Environment and dependency checks

- Validation ran in the sandbox with Node.js 22.13.0 and pnpm 11.25.0. The source workspace recommends Node.js 24; rerun release/deployment checks on that production version.
- `pnpm install --frozen-lockfile --ignore-scripts` completed for all 11 workspace packages. The root lockfile is the dependency source for active workspace apps.
- The legacy storefront's Better Auth dependency is pinned to its recorded `1.6.30` version. The shared TanStack Start/router family is pinned to the compatible versions used by that app's prior lock. This avoided mismatched upstream package exports while preserving a single root lockfile.
- All root scripts pass `node --check`.

## Build and test checks

- Root `pnpm run build` passed. It ran the workspace typecheck, then built all active app packages, including Tessera web/API, Vitality Supply, the legacy storefront, and UI preview. No database migrations were run.
- Non-blocking build warnings remain: Rolldown notes about module-level `use client` directives in the older Vite/Nitro storefront, and the Tessera web build reports some client chunks above 500 kB.
- Root `pnpm test` completed with zero failures: Vitality Supply test commands — 87 passed, 8 conditionally skipped; legacy storefront — 250 passed; Tessera API — 94 passed, 1 skipped. Total: 431 passed, 9 skipped.
- Database-backed API tests used only a throwaway sandbox-local PostgreSQL test database and a complete synthetic chart fixture. The root test runner used the dedicated `TESSERA_TEST_DATABASE_URL`; it did not substitute an app `DATABASE_URL`.
- A clean `pnpm dev` smoke test started the four user-facing apps. Each returned HTTP 200 on its default local port: 3000, 4173, 8080, and 5173. The API is opt-in and was not started during that smoke test because no local Tessera database URL was configured.

## Redundancy and source-path checks

- The SHA-256 audit records 52 shared UI components and 160 repeated-store path links (147 duplicate image contents, eight SQL migrations, and five identical utility modules). Fourteen byte-identical handoff copies were removed.
- No broken symlinks were found. Six groups of duplicate regular-file content are deliberately retained for standalone skill licenses/source notices, editable per-skill templates, package/directory markers, and app-local TypeScript path resolution; the reasons are recorded in `redundancy-ledger.csv`.
- Non-runtime screenshots were represented through OCR text where readable; raw user-attached repository-switcher screenshot bytes were not copied.

## Credential and privacy checks

- A redacted credential-pattern scan was run over staged text files. No live credential values are intentionally included. The tracked `.env.example` contains blank values; populated environment files and common private-key/credential files are ignored.
- The app's existing public business-contact fields were retained unchanged as requested for the public app experience; they are not runtime keys. Review them separately if those details should change.
- OCR processed 493 unique image contents: 465 yielded text, 17 had no confident text, six personal-record-indicator images were omitted, and five small decorative images were skipped. Ninety-eight line/item occurrences were redacted. OCR is lossy and not a substitute for reviewing a source image.
- Browser profile/session data, runtime databases, user-pasted unreviewed content, path-level personal-media inventories, and protected `1T` vault content were not staged.

## Scope limits

This validates the current public source snapshot and active workspace commands, not every historical branch, uncommitted workspace, agent branch, external deployment, credential store, or prior public history. Original source repositories remain unchanged and undeleted; the `1T` protected repository remains uninspected. No live production database or secret was used.
