---
name: GitHub repo tree snapshots
description: Reliable multi-repository inventory through the GitHub App connector.
---

**Rule:** Fetch recursive Git trees sequentially through the GitHub App proxy instead of issuing a parallel burst.

**Why:** A concurrent batch produced secondary 429 responses while the primary rate-limit quota remained high; sequential requests returned full trees.

**How to apply:** When comparing several repositories, request one tree at a time and reduce each response to paths, blob IDs, and sizes before returning it to the model.
