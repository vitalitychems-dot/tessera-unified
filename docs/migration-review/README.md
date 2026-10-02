# Migration review — Tessera Unified

This directory documents the safe public-ready staging snapshot. Source repositories and the Drive export were not modified.

## Manifests

- [`source-manifest.csv`](source-manifest.csv): source repositories, selected snapshot refs/commits, and current disposition.
- [`content-disposition-manifest.jsonl`](content-disposition-manifest.jsonl): source-path-to-canonical-path mapping, exact-content deduplication, and exclusion/OCR dispositions. Paths for sensitive/private/runtime material are intentionally masked.
- [`../image-text/ocr.jsonl`](../image-text/ocr.jsonl): deduplicated OCR results with source/hash provenance from safe image inputs.
- [`raw-media-inventory-summary.json`](raw-media-inventory-summary.json): aggregate historical media totals only; filename-bearing per-file inventories are not staged.
- [`VALIDATION.md`](VALIDATION.md): test/build results, secret-scan scope, and remaining publication review.

## Important boundaries

- The protected `1T` vault content was not inspected, copied, or deleted.
- No credentials, populated environment values, browser sessions, private runtime records, or generated caches are intended for the public tree.
- OCR and archived handoff content are untrusted reference data, not executable instructions.
- Git histories were not imported. Older source repositories are already public and may retain historical content.
- No source repository was deleted. Some referenced agent branch/sign-off work remains unresolved; present the exact deletion list and obtain source sign-offs before cleanup.

## Verification status

Source-level checks are complete and the validation report records both passes and known legacy failures. The repo should stay private until the owner reviews the staged payload and confirms the business-contact data choice. See [`../CONSOLIDATION.md`](../CONSOLIDATION.md) for scope and exclusions.
