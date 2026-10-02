---
name: Publish data migrations
description: Production behavior for custom SQL data migrations during artifact publishing.
---

Do not treat a successful artifact republish as proof that a custom SQL data migration ran against production.

**Why:** A sender-setting migration applied in development but was not recorded in the production `_migrations` table after republish, leaving the old stored value in place.

**How to apply:** Query the production row after publishing. Singleton configuration tables can be present with zero data rows, so critical read paths should use an idempotent runtime seed or supported admin-save path while still keeping action eligibility fail-closed.