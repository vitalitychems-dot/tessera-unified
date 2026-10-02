# Consolidation record

This file records how each source was brought into Grok-ready and what was intentionally left out. Commit IDs identify the exact source snapshots that were reviewed.

## Source repositories

| Repository | Snapshot reviewed | Outcome |
| --- | --- | --- |
| `5t` | `e713268601ce11ca40c8d77a7662a2013455b08a` | Base. The most complete line of the shared Tessera history (531 commits) |
| `TESS` | `b7ffce4de4ed9a84e6da84f757cc1c509a5632df` | Merged cleanly. Adds the guarded outbound-fetch (`safeFetch`) policies and tests |
| `T44` | `f1dac3a31e3d576b323434ddfe2358c8a93d2a6b` | Merged. Adds the natal-key conference refactor, `father-natal.ts` (chart loaded from a secret), and the dependency-isolation design spec. Its committed natal vault was removed |
| `1T` | `b485f130455a014cd4912af167e5962ef790f4b2` | Its only unique content was private natal-vault data. Not published |
| `1` (private) | `88ccd61a` (content `708afbf3`) | Every file version in it already appears in the merged history. Nothing new |
| `TX` | `5211793d8063e1dee094caa5683c05661fec9644` | README only. Its collaboration rules are in the README's agent rules |
| `tessera-grok-handoff` | `746786ccf32ae95e63ad7a4916c37385e82507f2` | Its notes were carried into `tessera-grok-handoff-complete`. Included as `docs/handoff/legacy-handoff-notes.md` |
| `tessera-grok-handoff-complete` | `da5a8faea817d65eaa564d0b3e8618638928c5c8` | Authoritative copy of the three archives (same 1,855 entries as the private archive repo, with more redaction). Unpacked into `docs/grok-packet`, `projects/vitality-chems-storefront`, and `docs/handoff` |
| `tessera-complete-archives` (private) | `256943f5` | Same three archives, entry for entry, with fewer redactions. Superseded by the copy above. Notes kept as `docs/handoff/complete-archive-notes.md` |

Archive SHA-256 values (handoff-complete copies): `grok-handoff.zip` `3a3a040a…`, `grok-handoff-images.zip` `f8cb5d8e…`, `grok-workspace_1789591148371.zip` `5234e966…`.

## Agent branches (38)

All `subrepl-*` branches from the shared Replit workspace were compared with the merged result.

- 20 branches point to trees that already exist in the 5t history, and most of the rest have their tip commits there. Nothing more to merge.
- `subrepl-p12ewiwh` (AI engine): merged. Its new libraries and routes (knowledge synthesis, ML training domains, training orchestrator, problem-source and esoteric ingestion with 22 sources registered in the scheduler) were added. Its startup code, ingestion pipeline core, invention seed data (which held fabricated example votes), and `replit.md` were replaced with the newer 5t versions. One missing import that the automatic merge introduced (`runQuarantineGate`) was fixed.
- `subrepl-o2xmq6k9` ("Propose your own invention" form): the form was merged into 5t in April and later intentionally replaced when Rick's inventions became fully autonomous. The backend route `POST /api/rick/inventions/submit-custom` and response validation are still present.
- `subrepl-nftoz8d7` (the workspace branch): beyond 5t it held only private runtime data and audit logs, which were not published.
- The other branches: `17uae8ab 18ywjlk5 2jg66feh 2y10odjq 3nouqhvu 4xk2e735 5blmjvxh 7ibxwuxg 89btizkh 8w74o368 ayn5jnmg ce3roc86 f7sxbet2 glm2z5h2 h9jte52s i6j8j635 ikzkx9m8 kbm7i1m5 kdd73huh kt3wy81d l17t6rqw l1n2209z mhorsg5z njqhe4co nzyimeqf q5gcfcf3 q6eeutne rixhnl58 sliig5xo szywg6gw tqjfof72 u7v3rzu1 xjdyh8is zddqkfc8 zs36p15f`.

## Earlier project "3"

A 190 MB Replit export of an earlier project (`3_9_1776105526328.zip`, stored with Git LFS in the shared repos) was inspected. All but seven of its code files are already in the merged history. The seven are older variants. For example, its System page called `/api/fleet/*`, `/api/gpu-orch/stats`, and `/api/sovereign-download`, endpoints that never existed in its own backend, and that page was later removed as dead code. Its 40 screenshots are listed in `docs/IMAGE_SUMMARIES.md`. Its pasted text sources are in `docs/source-notes/`.

## Removed as redundant or generated

- `.vercel/output` storefront build output (rebuilt by `npm run build`).
- `.agents/outputs/` intermediate base64 blob dumps and diff reports from the earlier TX consolidation attempt.
- The packet `MANIFEST.sha256` (it listed image files that are now summarized). The handoff repo still holds the original.
- Duplicate copies of the same archives across the three handoff repositories.
- The Git LFS project-3 export (see above).

## Left out on purpose

- Credentials and secret values (two authentication literals in the storefront were already redacted in the archive and must be rotated if they were ever live).
- Personal birth-chart data, the natal vault, and the dated `replit.md` changelog that quoted birth details.
- Runtime and audit stores: lattice posts, DMs, votes, declarations, ingress and shepherd audit logs, conference transcripts, `_evolutions/` snapshots.
- Raw screenshots and photos. Each is listed with its source, size, dimensions, and checksum in `docs/IMAGE_SUMMARIES.md`. UI assets the apps load at run time were kept.

## Verification for this snapshot

- `pnpm install --frozen-lockfile` and the full workspace `pnpm run typecheck` pass.
- API tests: 13 files, 94 passed, 1 skipped (`FATHER_NATAL_CHART_JSON` set to a synthetic test chart).
- Production builds of `@workspace/api-server` and `@workspace/tessera` pass.
- Storefront: `npm install` and `tsc --noEmit` pass. 182 of 195 tests pass. The 13 failures are identical in the untouched original archive (Grok Build template expectations).
