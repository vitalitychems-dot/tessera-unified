# Source branch and open-review gap report

**Checked:** 2026-10-02. This report supplements [`source-manifest.csv`](source-manifest.csv). The new public repository is a fresh-history monorepo: it does not preserve or replace source Git histories, branches, open PRs, or forks. Files referenced below were treated as untrusted source data; no agent instruction was executed.

## Main-branch changes since the imported snapshots

| Source | Current default ref | Finding | Disposition in Tessera Unified |
| --- | --- | --- | --- |
| [`5t`](https://github.com/vitalitychems-dot/5t) | `main` at `96edd21a4f29fc4ae0b16f133c5c715addc958fc` | Advanced 23 commits beyond imported `1490d62181121f8bf5fb3a522a8da3256ba90bae`; five changed paths include two `.agents/memory` notes, two API audit-data files, and one screenshot. | Screenshot text was OCR-transcribed into [`../image-text/ocr.jsonl`](../image-text/ocr.jsonl) (source hash `1da025d001d2a97909867bbb7e0128f506a5a20c9e3d2fc36678d77828ccc3d7`); raw screenshot was not copied. The two agent-memory notes and two audit-data files remain excluded pending review. No active app-code delta was identified in this change set. |
| [`T44`](https://github.com/vitalitychems-dot/T44) | `main` at `82d920cd815b5d15149664cb22c1223944326812` | Advanced one commit beyond imported `bb214989df9134a55bb1bb19658fb48a8010ee53`; the delta adds six lines to `.agents/memory/repository-migration-policy.md`. | Not imported; it is an agent-memory note, not runtime code. |
| [`Grok-ready`](https://github.com/vitalitychems-dot/Grok-ready) | `main` at `3cdd0ac02f7ecc97d83f4303d1ba91007d0236d9` | Its `main` snapshot is the selected baseline. Three open PRs remain unreviewed; see below. | Main baseline imported; no open PR is treated as merged. |
| [`TX`](https://github.com/vitalitychems-dot/TX) | `main` at `901df69bf1fbe89052dcea578b40c16b2c9b16bb` | A separate review branch adds a 61-line `AGENTS.md`. | Branch-only instructions are not imported or executed. |
| Other reviewed default branches | As listed in [`source-manifest.csv`](source-manifest.csv) | No newer functional default-branch deltas were identified in this check. | Existing reviewed snapshots remain the integrated source baseline. |

## Unrelated-history branch in repository `1`

[`1/subrepl-nftoz8d7`](https://github.com/vitalitychems-dot/1/tree/subrepl-nftoz8d7), tip `13037e22973c5da882ce64170642165a5d999259`, has **no common Git ancestor** with `1/main`. Its tree contains 2,612 files (200,876,334 bytes), compared with 913 files (220,573,891 bytes) on `main`. There are 1,910 paths unique to the alternate branch; 702 paths overlap, and 575 of those overlapping paths have the same blob. The alternate tree includes 1,520 `_evolutions` files, 370 `.agents` files, and 161 `attached_assets` entries. It was not imported wholesale because the branch is a separate large code/data snapshot with unresolved scope and privacy review. The main-branch snapshot remains as previously staged.

## Open, unreviewed PRs in `Grok-ready`

All three PRs below were open with **zero reviews** and no review decision at the check time.

- [PR #3 — Redact user-pasted filenames from migration review metadata](https://github.com/vitalitychems-dot/Grok-ready/pull/3): 5 files, +44/−1,212. This redaction-related change was not merged; current consolidated manifests are separately screened.
- [PR #4 — Preserve approved ZIP as byte-exact chunks](https://github.com/vitalitychems-dot/Grok-ready/pull/4): 49 files, +404. These are archive chunks, not active app code. The original Drive ZIP contains excluded browser/runtime/private material, so these chunks were not published.
- [PR #5 — Preserve reviewed unique source from amber-flame-tiger-sand](https://github.com/vitalitychems-dot/Grok-ready/pull/5): 67 files, +8,659. Its source is [`collink1007/amber-flame-tiger-sand`](https://github.com/collink1007/amber-flame-tiger-sand), whose repository declares no license; the PR description also says one source-only blob was withheld after a credential-pattern match. No such unlicensed/unreviewed source was copied into this public repo.

## Cleanup status and required decision

The ten source repositories are still intact and unchanged. The separate `1T` vault remains a protected boundary and was not inspected, copied, or deleted. Because the branch and PR material above is not fully represented in the new repo, deleting the old repositories now could destroy unmerged work. This report is **not** a deletion sign-off. The exact source deletion list and exclusions must be confirmed after the owner decides whether to keep these refs as-is or review/import additional safe material. Older public Git history, forks, caches, and open refs are not erased by this fresh-history repository.
