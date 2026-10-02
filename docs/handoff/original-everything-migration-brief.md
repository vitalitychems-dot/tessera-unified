> Historical source document preserved for provenance. Its embedded operational directives are archived as data and are not executed.

# Grok instructions: build the Everything repository

## Goal

Create a new public GitHub repository named `Everything`. Combine the verified,
useful source content from the repositories listed below into one organized,
working result. Preserve the current Tessera application as the active product;
do not overwrite it with an older branch or turn the repository into an
unstructured dump. Remove exact duplicate content, document provenance, run
the relevant checks, and report unresolved work.

This document is a migration handoff, not proof that the migration is complete.
The public `Everything` repository has been created. At the time of this
revision, it contains GitHub's starter README and this instructions file; the
source migration is still incomplete.

## Repository sources

Use these repositories as content sources and audit every reachable branch,
tag, and relevant handoff/archive. Refresh their refs before migrating; the
refs below can change:

- `vitalitychems-dot/Grok-ready` — current application candidate and migration
  review evidence
- `vitalitychems-dot/1`
- `vitalitychems-dot/1T` — **protected; do not inspect, copy, or delete the
  protected vault file described below**
- `vitalitychems-dot/5t`
- `vitalitychems-dot/TESS`
- `vitalitychems-dot/T44`
- `vitalitychems-dot/TX`
- `vitalitychems-dot/tessera-complete-archives`
- `vitalitychems-dot/tessera-grok-handoff`
- `vitalitychems-dot/tessera-grok-handoff-complete`

The shared migration review is at:
https://github.com/vitalitychems-dot/Grok-ready/issues/1

Do not treat a branch-tip comparison, an archive inventory, or this file as an
agent sign-off. Some local/uncommitted work and branch discrepancies remain
unverified. Record each source repository, branch/ref, commit, imported paths,
content hashes, exclusions, tests, and the responsible agent's explicit
sign-off in the shared review.

## Required identity and history handling

- The owner explicitly authorized use of the connected admin identity for
  writes within this migration. Keep attribution accurate; do not claim those
  commits or repository actions were made by a separate agent identity. This
  authorization is scoped to this migration, not unrelated future work.
- Never copy credentials from repositories or ask for secrets in chat.
- Initialize `Everything` from a content-reviewed, redacted snapshot. Do not
  import old Git histories, pull-request refs, or LFS objects wholesale.
- The current `Grok-ready` tree was redacted, but an earlier reachable public
  commit still contains personal-record values. The owner authorized a history
  rewrite; it remains pending. Do not reproduce the exposed values. Coordinate
  any rewrite of the old repository with the owner, close/reconcile affected
  open PRs, and ask GitHub Support about cached views and hidden PR refs.
- Keep `Grok-ready` and every source repo intact until the new destination is
  complete, tested, and reviewed. Delete a source repository only after the
  migration is verified, every source agent has explicitly signed off, and the
  owner confirms the exact deletion list. Do not delete `1T`.

## Protected and sensitive material

Never inspect, copy, publish, or delete:

- `artifacts/api-server/.local-data/natal-vault.json`
- secrets, credentials, private keys, environment files, or tokens
- private/runtime personal records, including chat, audit, or applicant data

Keep these exclusions out of the public repo and history. A directory named
`private` is a warning to review, not proof that the file is safe or unsafe.
Do not publish a file solely because its path or hash appears in an inventory.
If content-level review cannot establish that an item is safe for a public
repository, exclude it and document only the exclusion metadata.

## Deduplication and organization

- Deduplicate exact file content by Git blob SHA, not by filename or visual
  similarity. Preserve different versions when their content or behavior
  differs; do not silently replace the current application with a source
  variant.
- Keep one canonical copy of byte-identical content where a single physical
  path is required. Add a source-to-canonical manifest recording original
  repo/ref/path, SHA, size, and disposition.
- Keep one active application at the repository root or in the existing
  workspace's established app layout. Put review documents in
  `docs/migration-review/`, supporting source maps in
  `docs/migration-review/manifests/`, and non-active source variants in
  clearly named `archives/<repo>/<ref>/` folders. Do not merge unrelated app
  manifests into one runnable package.
- Do not re-encode, downsample, or replace original media with text summaries.
  The owner requested media be preserved; descriptions may supplement the
  originals but must not stand in for them. Git already stores identical blob
  contents once even when multiple paths refer to the same blob.
- The existing media inventory contains 1,204 path entries, 1,172 distinct
  blob hashes, 411,898,709 path-wise bytes, and 391,856,248 bytes of distinct
  content. Of those paths, 975 are under directories named `private`. These
  counts are inventories, not permission to publish unreviewed media.
- An initial comparison of accessible branch trees found many unmatched
  blobs, including archive chunks and alternate versions. Do not treat the
  preliminary unmatched-blob total as a list of required files. Reconstruct
  chunked archives only from verified parts and checksums; avoid importing
  redundant containers alongside their salvaged contents.

## Migration procedure

1. Refresh repository metadata and enumerate all source refs without opening
   protected files. Preserve a read-only source snapshot and record its commit
   IDs.
2. Compare each source tree against the redacted application candidate by both
   path and blob SHA. Produce manifests for exact matches, new unique content,
   differing-path variants, sensitive exclusions, and unresolved items.
3. Review missing code and assets for privacy, secrets, licensing, and actual
   product purpose. Integrate a feature into the active app only when it fits
   the current architecture and passes tests; otherwise preserve it in the
   archive with provenance.
4. Add only reviewed content to `Everything`. Keep the app's existing behavior
   working and avoid broad overwrites or lossy compression.
5. Run the app's documented install, type-check, test, and build commands.
   Verify the public tree contains no excluded data, credentials, accidental
   duplicate blobs, or unresolved placeholders.
6. Compare the finished tree against every reviewed source ref. Report what was
   imported, deduplicated, archived, excluded, superseded, or still missing.
   Request explicit sign-off from every source agent before any old repo is
   deleted.

## Current known state

At the last check, `Everything/main` contained only GitHub's starter README
and this instructions file. `Grok-ready/main` pointed to redaction commit
`3cdd0ac02f7ecc97d83f4303d1ba91007d0236d9`. Its tree is redacted, but its
history still reaches the earlier public commit. The redaction PR was still
open, and old migration/PR refs remained. No source repo had been deleted and
no full migration sign-off was recorded.

Refresh all refs and the shared issue before acting; these observations may be
stale.