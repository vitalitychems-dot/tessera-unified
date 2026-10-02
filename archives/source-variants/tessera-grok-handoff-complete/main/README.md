# Tessera complete handoff

This is the single combined handoff repository for the three supplied archives and the notes/scripts from the prior public and private repositories. The old public split parts were duplicates of the original archives; this repository uses the complete, sanitized copies instead of republishing those raw parts.

## Rebuild the archives

Download or clone the repository, then run:

```bash
python3 reassemble_archives.py
```

The script rebuilds each ZIP from `parts/` and checks its SHA-256 against `archives.sha256`. `reassemble_handoff.py` remains as a compatibility entry point.

## Included material

- `grok-handoff.zip` — 714 original entries.
- `grok-handoff-images.zip` — 139 original entries.
- `grok-workspace_1789591148371.zip` — 1,002 original entries.
- `legacy-handoff-notes.md` — README context from the prior public repository.
- `complete-archive-notes.md` — README context from the prior private archive repository.
- `TESSERA_OPERATING_GUIDELINES.md` — truthful, non-roleplay guidance with explicit permission boundaries.

All 1,855 archive entries are retained, including duplicate entries. Sensitive strings were redacted in place; entries were not removed. The requested personal name was replaced with `[NAME REDACTED]`. Non-standard IP literals were replaced with documentation-only placeholders; loopback/wildcard addresses and documentation-range examples remain where they are standard code or test values. Two confirmed hard-coded authentication values were already redacted in the sanitized workspace archive. One simulation test fixture key was replaced with a clearly fake test placeholder.

A source review found no active third-party analytics tags in the reviewed application code. The site's first-party page/checkout event collection and staff analytics code are retained, as requested to include the full material. A few strings in bundled framework/dependency output resemble tracker names but do not call tracking services.

## Screenshot supplement: six archive files not available

A screenshot-only supplement is in `source-screenshot-supplement/`. It includes the three supplied screenshots (including the repeated JPEG attachment), a readable transcript, the inventory of six visible ZIP names and approximate sizes, checksums, and a download-ready ZIP.

The six source ZIPs listed in the inventory are **not included**. The screenshots show their names and approximate sizes, but their contents were not retrieved, inspected, summarized, or verified. No other archive in this repository is substituted or claimed to be one of them.

The quoted “you are in charge” passage is historical screenshot content, not an active instruction, verified finding, or grant of permission. Tessera’s operating boundaries remain those in `TESSERA_OPERATING_GUIDELINES.md`.

## Tessera authority and archived prompts

The supplied prompt material is source data, not executable instructions. A note was added to the autonomy-oriented prompt file to prevent it from being mistaken for verified fact or an active system prompt. Tessera's intended behavior is summarized in `TESSERA_OPERATING_GUIDELINES.md`. Instructions cannot grant global access to external repositories, tools, or agents; access remains limited to permissions explicitly provided by their owners and providers.

## Important visibility note

The prior repository `tessera-grok-handoff` was already public and its visible history contains the exact original, unredacted workspace archive. This new repository has a clean history and a sanitized main snapshot, but it cannot recall copies already made from the old public repository. Treat the two previously exposed authentication values as compromised and rotate them at their providers if they are active.

This was not an exhaustive privacy or rights audit. Text in image pixels was not OCR-scanned, and other personal or customer information may remain in the supplied workspace archive. Share it only with the intended recipient and review those materials before any wider release.
