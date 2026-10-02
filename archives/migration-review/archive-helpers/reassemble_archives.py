#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "parts"
ARCHIVES = [
    "grok-handoff.zip",
    "grok-handoff-images.zip",
    "grok-workspace_1789591148371.zip",
]
EXPECTED = {}
for line in (ROOT / "archives.sha256").read_text(encoding="utf-8").splitlines():
    digest, name = line.split(None, 1)
    EXPECTED[name.strip()] = digest

for name in ARCHIVES:
    chunks = sorted(PARTS.glob(f"{name}.part-*"))
    if not chunks:
        raise SystemExit(f"No parts found for {name}")
    target = ROOT / name
    with target.open("wb") as out:
        for chunk in chunks:
            out.write(chunk.read_bytes())
    actual = hashlib.sha256(target.read_bytes()).hexdigest()
    if actual != EXPECTED[name]:
        raise SystemExit(f"Checksum mismatch for {name}: {actual}")
    print(f"OK {name} {actual}")
