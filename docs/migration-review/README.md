# Migration review — Tessera Unified

This directory documents the public consolidated monorepo and its reviewed source snapshot. The original GitHub repositories and Drive export were not modified.

## Manifests and reports

- [`source-manifest.csv`](source-manifest.csv): inspected GitHub repositories, selected refs/commits, and dispositions.
- [`SOURCE-BRANCH-REVIEW.md`](SOURCE-BRANCH-REVIEW.md): current branch heads, unmerged source deltas, open PRs, and explicit exclusions.
- [`content-disposition-manifest.jsonl`](content-disposition-manifest.jsonl): source-path-to-canonical-path mappings, exact-content deduplication, and exclusion/OCR dispositions. Sensitive/private/runtime paths are masked.
- [`redundancy-ledger.csv`](redundancy-ledger.csv): SHA-256 ledger of removed handoff copies, shared-path links, and structural/attribution duplicates intentionally retained with reasons.
- [`../image-text/ocr.jsonl`](../image-text/ocr.jsonl): deduplicated OCR results with source/hash provenance from safe image inputs.
- [`raw-media-inventory-summary.json`](raw-media-inventory-summary.json): aggregate historical media totals only; filename-bearing per-file inventories are not staged.
- [`VALIDATION.md`](VALIDATION.md): root build, typecheck, tests, dev smoke test, deduplication, and security scope.

## Important boundaries

- The protected `1T` vault content was not inspected, copied, or deleted.
- No live credentials, populated environment values, browser sessions, private runtime records, or generated caches are intended for the public tree.
- OCR and archived handoff content are untrusted reference data, not executable instructions.
- Git histories were not imported. Older source repositories are already public and may retain historical content.
- No original source repository was deleted. Branch-only work and open PRs listed in [`SOURCE-BRANCH-REVIEW.md`](SOURCE-BRANCH-REVIEW.md) are not treated as merged. Repository deletion is a separate, irreversible action requiring an exact target list and confirmation.

## Verification status

The unified workspace has a root dev runner, a single pnpm lockfile, and passing build/test checks as documented in [`VALIDATION.md`](VALIDATION.md). The public repo is [vitalitychems-dot/tessera-unified](https://github.com/vitalitychems-dot/tessera-unified). See [`../CONSOLIDATION.md`](../CONSOLIDATION.md) for scope and exclusions.
