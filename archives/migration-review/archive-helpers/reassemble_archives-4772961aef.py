#!/usr/bin/env python3
from pathlib import Path
import hashlib
ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "parts"
ARCHIVES = ["grok-handoff.zip", "grok-handoff-images.zip", "grok-workspace_1789591148371.zip"]
def main():
    expected = {}
    for line in (ROOT / "archives.sha256").read_text(encoding="utf-8").splitlines():
        digest, name = line.split(None, 1)
        expected[name.strip()] = digest
    for name in ARCHIVES:
        chunks = sorted(PARTS.glob(f"{name}.part-*"))
        if not chunks: raise SystemExit(f"No parts found for {name}")
        target = ROOT / name
        digest = hashlib.sha256()
        try:
            with target.open("wb") as out:
                for chunk in chunks:
                    with chunk.open("rb") as part:
                        while block := part.read(1024 * 1024):
                            out.write(block); digest.update(block)
            actual = digest.hexdigest()
            if actual != expected[name]: raise ValueError(f"Checksum mismatch for {name}: {actual}")
        except Exception:
            target.unlink(missing_ok=True); raise
        print(f"OK {name} {actual}")
if __name__ == "__main__": main()
