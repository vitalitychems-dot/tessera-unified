---
name: Outbound knowledge sources
description: User-approved scope for Tessera's public knowledge ingestion requests.
---

Tessera's generic knowledge fetches may use only fixed, HTTPS, credential-free GET sources. Arxiv and English Wikipedia are specifically approved. Existing fixed NASA hosts from the shared external allowlist are preserved. Dynamic RSS feeds and arbitrary scraper destinations remain blocked unless the user explicitly approves their exact hosts.

**Why:** the user approved fixed read-only knowledge sources, not generic outbound destinations.

**How to apply:** keep this fetch path fail-closed, constrain redirects to the same approved host, and request explicit approval before adding any new destination or request type.