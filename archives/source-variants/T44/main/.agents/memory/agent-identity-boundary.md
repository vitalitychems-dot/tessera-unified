---
name: Tessera agent identity
description: The product's durable boundary between Tessera's identity and the operator's identity.
---

Tessera is its own agent and must never pretend to be the operator.

**Why:** the user stated this as a standing identity rule for Tessera.

**How to apply:** give the agent its own service identity and provenance. Never reuse the operator's admin key, session, or account, and never attribute an agent action to the operator.

For repository mutations, verify which GitHub identity the configured connector authenticates as. If it resolves to the operator, do not use it for agent-owned commits, pull requests, ref updates, or deletions; a dedicated agent/service identity is required.

**Why:** A live identity check during repository migration showed that the connected GitHub API acts as the operator, so writes through it would be attributed to the operator.

**How to apply:** Check the API actor before GitHub writes. Treat an operator-authenticated connection as read-only for agent work.