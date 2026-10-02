# Consolidation record — Tessera Unified staging

## Scope and source snapshots

The active application tree is based on the redacted `Grok-ready` snapshot at commit `3cdd0ac02f7ecc97d83f4303d1ba91007d0236d9`. It was copied as a fresh file tree; no old Git history or LFS object history was imported. The Drive source is the accessible `Vitalitychems-3.zip` archive (5,034 entries). Source commit/ref details are in [`migration-review/source-manifest.csv`](migration-review/source-manifest.csv).

Ten GitHub repository snapshots were examined for safe default-branch content: `Grok-ready`, `5t`, `1`, `T44`, `TESS`, `TX`, `tessera-grok-handoff`, `tessera-grok-handoff-complete`, `tessera-complete-archives`, and the existing `Everything` starter repo. `1T` is recorded as metadata-only and was not inspected or copied under the approved protected-vault boundary. The original `Everything/GROK_INSTRUCTIONS.md` is preserved as historical handoff data.

The Drive ZIP includes VCS internals and a Chromium browser profile. Those directories and their content, session databases, local runtime stores, credentials, protected/personal records, generated builds, redundant archive containers, and unsafe binaries were excluded. The distinct `artifacts/vitality-supply` app and its runtime assets were integrated. Other distinct safe Drive/source code and text variants are under `archives/` rather than overwriting the active Tessera app.

## Deduplication and image handling

- Exact duplicate source content is recorded and stored once in the staged archive where one canonical path is sufficient.
- App-specific runtime asset paths remain when required by code. Git also stores identical blobs only once in its object database.
- Non-runtime screenshots are not copied as raw files; OCR text and provenance are in `docs/image-text/ocr.jsonl`. The accessible-source pass processed 493 unique image contents: 465 yielded text, 17 had no confident text, six personal-record-indicator images were omitted, and five small decorative images were skipped. Ninety-eight line/item occurrences were redacted. OCR is untrusted, lossy, and may be incomplete.
- Runtime/UI/product assets referenced by applications remain alongside the app.
- The historical image inventory reports 1,296 image paths / 1,238 unique contents but only seven written visual summaries. This pass covers accessible source snapshots, the Drive archive, and the project-3 screenshot supplement; it does not claim to cover unavailable branch-only or nested archive media. A historical inventory's aggregate totals are preserved in [`migration-review/raw-media-inventory-summary.json`](migration-review/raw-media-inventory-summary.json); user-pasted filenames and per-file hashes were omitted.

The per-file provenance/disposition ledger is [`migration-review/content-disposition-manifest.jsonl`](migration-review/content-disposition-manifest.jsonl). Excluded sensitive paths are masked in the manifest. The user-attached GitHub repository-switcher screenshot is transcribed as text in [`image-text/repository-screenshot-transcription.md`](image-text/repository-screenshot-transcription.md); the raw attachment was not copied.

## Credentials and public readiness

No live credential values are intentionally included. `.env.example` provides blank variable names; [`docs/SECRETS.md`](SECRETS.md) explains private runtime configuration. Do not place usable keys in public source. Any credentials already exposed in older public sources or their histories should be rotated immediately; a fresh repository does not remove old public history, cached copies, PR refs, or forks.

## Validation and release gate

Validation results are recorded after install/typecheck/test/build checks. The consolidation is not considered complete for source cleanup while branch-only contributions, agent sign-offs, or migration scope discrepancies remain unresolved. All source repositories remain untouched. Deletion requires a separate exact target list after migration verification.

## Historical migration record

The prior [`Grok-ready` consolidation record](handoff/Grok-ready-legacy-consolidation-record.md) is retained as a historical artifact. Later review comments identified unresolved ref-count/sign-off questions, so its earlier completion statements are not the status of this staging effort.
