---
name: Deployment domains and auth origin trust
description: The published site answers on more domains than the brand domain; every host allowlist must cover all of them, exact-match in production.
---
The deployment's primary URL is `https://vitalitychems.com` (with an "s"), with `vitalitychem.com` and `vitalitychem.replit.app` as additional domains. Any host/origin allowlist (Better Auth `allowedHosts`/`trustedOrigins`, the same-site request guard) must include all of them — they now come from one shared server-only host module.

**Why:** Production logs showed repeated `[Better Auth]: Invalid origin: https://vitalitychems.com` because only the brand domain was listed, so sign-in on the primary domain failed silently. A code review also flagged that `*.replit.app`-style suffix matches trust every other Replit tenant, so production trusts exact hostnames only; wildcards are a development convenience.

**How to apply:** When a domain is added or removed in Publishing, update the shared host list and republish. Reproduce origin failures by checking deployment logs for "Invalid origin" before touching auth code.
