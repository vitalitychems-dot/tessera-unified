<!-- Historical README from the prior private archive repository. Its earlier checksum is superseded by archives.sha256 here. -->

# Tessera complete source archives (private handoff)

This private repository contains all three supplied archives, split into 512 KiB GitHub-safe parts. Every source archive entry is preserved, including duplicate entries. The workspace archive has two authentication-secret literals replaced with explicit redaction markers; no file was removed. The secret values are not included. If either value was live, rotate it at its provider.

The raw workspace archive is unreviewed project material. Keep this repository private; inspect its contents before sharing it with any model or person.

## Reassemble

Download/clone this repository, then run:

```bash
python3 reassemble_archives.py
```

The script writes the three ZIP files in this folder and verifies each SHA-256 against `archives.sha256`. The parts are stored in `parts/`.

## Included source archives

- `grok-handoff.zip` — selected handoff archive from the supplied source set.
- `grok-handoff-images.zip` — image companion archive from the supplied source set.
- `grok-workspace_1789591148371.zip` — raw workspace archive; retains all entries, with only the two hard-coded authentication values redacted in place.

The first two archives are unchanged. Exact source hashes are in the manifest below for provenance; the workspace hash in `archives.sha256` is for the redacted, published copy.

- `grok-handoff.zip`: 714 entries, 47980601 bytes; source SHA-256 `5eb22d30dede86eab0b4bf9ebd664efc115f38cb21391c8fd4dfb35e7a5d6af8`; published SHA-256 `5eb22d30dede86eab0b4bf9ebd664efc115f38cb21391c8fd4dfb35e7a5d6af8`
- `grok-handoff-images.zip`: 139 entries, 61488960 bytes; source SHA-256 `6fd76ff535819bdf50aacccc1ccb0bf557a514e78ae830861ce059fc6c3f37c6`; published SHA-256 `6fd76ff535819bdf50aacccc1ccb0bf557a514e78ae830861ce059fc6c3f37c6`
- `grok-workspace_1789591148371.zip`: 1002 entries, 52959245 bytes; source SHA-256 `5a10d393c4900d297008893ead0e1a963cb6b32ec83ef9389a71ec4822921123`; published SHA-256 `2573906044e714f735cc4e33c890968f75f47ccab2db7ccfbb1bd8532d1c1b68`
