# Consolidation and integration record — Tessera Unified

**Status:** Public consolidated repository; integration changes and validation recorded for the 2026-10-02 update.

## Scope and source snapshots

The active Tessera tree is based on the reviewed, redacted `Grok-ready` snapshot at commit `3cdd0ac02f7ecc97d83f4303d1ba91007d0236d9`. The accessible Drive input was `Vitalitychems-3.zip` (5,034 archive entries). Source refs and dispositions are listed in [`migration-review/source-manifest.csv`](migration-review/source-manifest.csv).

Ten GitHub repositories were examined for safe default-branch content: `Grok-ready`, `5t`, `1`, `T44`, `TESS`, `TX`, `tessera-grok-handoff`, `tessera-grok-handoff-complete`, `tessera-complete-archives`, and the `Everything` starter repo. The `1T` protected-vault repository was kept metadata-only; its contents were not inspected, copied, or deleted. No old Git histories were imported. The original `Everything/GROK_INSTRUCTIONS.md` is retained as historical handoff material.

A follow-up review found default-branch deltas in `5t` and `T44`, an unrelated-history branch in `1`, an instruction-only branch in `TX`, and three open PRs in `Grok-ready`. Exact current refs, review states, and exclusions are documented in [`migration-review/SOURCE-BRANCH-REVIEW.md`](migration-review/SOURCE-BRANCH-REVIEW.md); these unmerged items are not claimed as integrated.

The Drive ZIP included VCS internals, a Chromium browser profile, local runtime stores, generated builds, archive containers, sensitive/personal records, credentials, and unsafe binaries. Those were excluded. Reviewed code variants that are not part of the active workspace are organized under `archives/`; the active apps are documented in [`PROJECT_MAP.md`](PROJECT_MAP.md).

## Functional integration

- The root pnpm workspace and lockfile include Tessera web/API, Vitality Supply, the earlier Vitality Chems storefront, the UI preview sandbox, shared libraries, and scripts.
- `pnpm dev` is the suite launcher for the four user-facing apps. It launches the Tessera API only for a loopback PostgreSQL URL and gives each storefront an independent local database variable. Duplicate ports and unsafe database URLs are rejected or skipped before they can start.
- Root `pnpm test`, `pnpm run typecheck`, `pnpm run build`, and `pnpm audit` are the workspace-wide entry points. Build and test workflows do not run database migrations.
- GitHub Actions runs frozen install, full dependency audit, typecheck, tests against an ephemeral PostgreSQL service with a synthetic chart fixture, and the workspace build. It receives no production credentials and has read-only repository permissions.
- The stores retain separate app/data/auth/payment boundaries. This is a unified repository and launcher, not a migration or merge of customer accounts, sessions, payment records, or databases.
- The earlier storefront's `better-auth` is pinned to its prior validated app version; the TanStack Start/router family is pinned to the compatible set used by the workspace. These pins make the full legacy and current app builds reproducible together.

## Deduplication and image handling

- Fourteen byte-identical handoff copies were removed where canonical app/document paths already contain the same content.
- Fifty-two identical mockup/Tessera UI primitives share canonical tracked files.
- The repeated-store ledger records 160 linked paths: 147 identical image contents, eight repeated SQL migrations, and five byte-identical utility modules. Runtime paths remain available; a symlink replaces duplicated content instead of removing an app's path.
- The final hash audit found no broken links. The six remaining regular-file duplicate-content groups are intentionally retained and individually recorded in [`migration-review/redundancy-ledger.csv`](migration-review/redundancy-ledger.csv): standalone skill licenses and source notices, independently editable rule templates, empty package/directory markers, and the two app-local TypeScript configs. Linking or deleting those copies would break app-specific config resolution, standalone attribution/provenance, or package layout. The obsolete zero-byte dependency marker and redundant empty API `lib/` keepfile were removed.
- Non-runtime screenshots are not copied as raw files. OCR processed 494 unique image contents: 466 yielded text, 17 had no confident text, six personal-record-indicator images were omitted, and five small decorative images were skipped; 98 line/item occurrences were redacted. OCR is lossy, untrusted, and may be incomplete. Product/runtime images remain at canonical app paths.
- The user-attached GitHub repository-switcher screenshot is transcribed in [`image-text/repository-screenshot-transcription.md`](image-text/repository-screenshot-transcription.md); a later source-branch status screenshot is represented only as OCR text/provenance in [`image-text/ocr.jsonl`](image-text/ocr.jsonl). Raw screenshot files were not copied.

The content-level provenance/disposition data is in [`migration-review/content-disposition-manifest.jsonl`](migration-review/content-disposition-manifest.jsonl). Sensitive excluded source paths are masked there. Aggregate historical raw-media counts are preserved in [`migration-review/raw-media-inventory-summary.json`](migration-review/raw-media-inventory-summary.json); user-supplied filenames and per-file raw inventory paths are not included.

## Credentials, privacy, and publication

No live credential values are intentionally included. `.env.example` contains blank values; [`SECRETS.md`](SECRETS.md) documents runtime configuration. The user approved publication as-is with no live keys; the apps' existing public business-contact fields were left unchanged for app behavior. Any credential that may have appeared in prior public source or history should still be rotated: a fresh-history repo does not erase old public histories, caches, forks, pull-request refs, or copies.

## Validation and source cleanup status

Current build/test, full dependency-audit, and local smoke-check results are recorded in [`migration-review/VALIDATION.md`](migration-review/VALIDATION.md). The consolidated repository is public at `https://github.com/vitalitychems-dot/tessera-unified`.

All original source repositories remain untouched and were **not deleted**. Branch-only work, open PRs, owner/agent sign-offs, and unresolved source-scope discrepancies are not silently treated as merged. The protected `1T` repo was not inspected. Deleting old repositories is a separate irreversible cleanup action and requires the exact target list and confirmation after source-owner review.

## Historical migration record

The prior [`Grok-ready` consolidation record](handoff/Grok-ready-legacy-consolidation-record.md) is retained as historical material. Later review comments identified unresolved ref-count/sign-off questions, so earlier completion statements do not define the scope of this repository.
