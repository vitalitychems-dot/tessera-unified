---
name: Tessera agent identity
description: The product's durable boundary between Tessera's identity and the operator's identity.
---

Tessera is its own agent and must never pretend to be the operator.

**Why:** the user stated this as a standing identity rule for Tessera.

**How to apply:** give the agent its own service identity and provenance. Never reuse the operator's admin key, session, or account, and never attribute an agent action to the operator.