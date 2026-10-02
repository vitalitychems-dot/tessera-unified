# TX Agent Instructions — Tessera Consolidation

**Status: review required. No source code, archive content, or branches have been merged into TX by this review.** The owner requires all five participating agents to review and agree that their work has been preserved before final acceptance or source deletion. TX is the staging destination; public vitalitychems-dot/Grok-ready is the final destination.

## Goal and scope

The owner wants all unique Tessera work staged/reconciled through public `vitalitychems-dot/TX`, with public `vitalitychems-dot/Grok-ready` as the final shared repository. Combine all project snapshots, handoff/archive material and Replit branches while removing only verified redundancy.

GitHub repositories identified so far:
- `1T`
- `5t`
- `1` (currently private; copied contents become public in TX)
- `TESS`
- `T44`
- `tessera-grok-handoff-complete`
- `tessera-complete-archives` (currently private; copied contents become public in TX)
- `tessera-grok-handoff`

The screenshots show Replit `subrepl-*` branches as well. The initial `1T` workspace inventory found 37 local `subrepl-*` refs; they were not published as GitHub branches at that time. Recheck every branch head and its uncommitted work before migration; do not assume the eight GitHub repository snapshots include them.

Initial scans found 1,301 distinct paths and 68 same-path content conflicts across the five project snapshots. They also found exact duplicate UI files. These counts are only a starting point: refresh them against current heads before deciding what to remove.

## Agreement gate — required before final acceptance and cleanup

Each of the five active agents must review the same source inventory and agree on one merge model. Silence or an incomplete response does not count as agreement. The owner must also approve the selected model. The owner has requested staging work in TX for review. Until review is complete, do not declare migration complete, overwrite shared canonical branches, reset a working tree, delete branches, or delete repositories.

The clean-tree model was proposed but has **not** been approved. Agents should review these choices and raise any alternative:
1. One canonical TX tree, with source commit IDs recorded and original histories kept in the source repositories.
2. Preserve source histories in TX branches or tags, plus a consolidated canonical tree; this retains history but leaves historical versions in the repository.

## Required response from each agent

Reply on the review pull request with `AGREED` to the same merge model, or `OBJECTION` with the change needed. Include:
- Agent/session identifier and source repository
- Current branch and full latest commit SHA
- Any uncommitted or unpushed work
- Unique features, files, or data that must be retained
- Large files and Git LFS status
- Any conflicts, public-visibility concerns, or requested plan changes

## Safe merge rules after agreement

- Keep every unique file and feature. Remove only byte-identical copies after checking hashes and confirming that consumers/builds remain valid.
- Compare conflicting same-path files and ask their author before choosing or combining versions; do not overwrite by repository order.
- Verify archive parts and checksums before deduplicating or reassembling them. Preserve distinct variants.
- Keep the approved large ZIP in Git LFS and verify every referenced LFS object in TX.
- TX is public. Never publish credentials, API keys, tokens, or other secrets. Review private-source contents before copying them.
- Use short-lived branches and pull requests after agreement. Do not force-push or push work directly to `main`.
- Do not delete any source repository or branch during migration.

## Completion and repository cleanup

After migration, each of the five agents must verify the TX tree and post that all of their assigned work is present. Reconcile those checks against the source SHAs and the branch inventory. Only after all agents confirm completion may the owner review the exact list of source repositories proposed for deletion. Obtain the owner’s final confirmation of that list before deleting anything; until then, keep the originals intact.

The uploaded Git-panel screenshots are reference material for identifying branches, not project assets; do not commit them unless the owner separately requests it.

## Final repository and open preservation review

The exact final repo is https://github.com/vitalitychems-dot/Grok-ready . Another agent has already populated it; inspect and preserve that work rather than replacing it blindly. Its consolidation record documents exclusions of original non-UI images, the LFS export, private vault data and runtime stores. The current owner request is to include everything except verified redundancy, so those dispositions require review. Do not infer completeness from the commit title or file count.

All five agents should record their source/target commit SHAs, missing work, checks and explicit completion decision in https://github.com/vitalitychems-dot/Grok-ready/issues/1 . Do not post secret values or private file contents in comments. Keep all source repos intact until every contribution is accounted for, all agents sign off on the same target commit, and the owner confirms the exact deletion list.
