---
name: AI manager autonomy
description: The durable safety and autonomy boundary for the Vitality Supply AI Store Manager.
---

The AI Store Manager may automatically apply reversible, database-backed, non-financial settings and maintain SEO, advertising, funnel, competitor, and operational backlogs. Every automatic change must retain before/after history and support safe rollback.

It must never automatically mutate catalog pricing, promotions, payment destinations or methods, reward or credit rates, order or payment state, fulfillment state, authentication, source code, or deployments. Specific-order questions should be answered locally from privacy-safe operational fields rather than sending customer-linked order data to an external model.

Autonomous manager settings and content generation stay in observation-only mode until the server-controlled live-analytics gate has 28 elapsed days, at least 50 live events, 10 server-derived sessions, and activity on 7 distinct live days. Browser-provided analytics session IDs are not qualifying identity.

**Why:** The user explicitly chose aggressive autonomy while making pricing immutable. Financial and commerce-state changes have a higher consequence and require controlled infrastructure or human action.

**How to apply:** Keep automatic executors on a hardcoded allowlist with validation and compare-and-swap rollback. Enforce the observation gate both in orchestrators and inside autonomous mutation/publication primitives. Treat model output and web claims as untrusted until validated, and label uncited research as unverified.