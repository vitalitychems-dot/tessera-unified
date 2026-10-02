---
name: AI manager audit quirks
description: Environment facts that skew the store manager's audits and how its model calls must be shaped.
---
# AI store manager: audit and model-call quirks

- **Autoscale cold start skews probes.** The first production request after idle can take ~2 s; warm TTFB is ~0.15 s. Audits send one measured warm-up request first and then probe sequentially, and the prompt tells the model to interpret a slow first sample as cold start, not a regression. Concurrent probes make every sample look slow.
- **Replit's proxy rewrites `cache-control: public` to `private`** while keeping `max-age`. A "not cacheable" finding based on the `private` directive is a false positive; the prompt documents this.
- **Structured outputs carry no web-search annotations.** With `web_search` and a JSON schema, verification must come from `web_search_call.action.sources[].url` (request `include: ["web_search_call.action.sources"]`); otherwise every cited competitor page looks unverified.
- **Refuse, don't just redact, before the provider call.** Admin questions pass through `sanitizeManagerText(..., "question")` (emails, phone/tracking/card digit runs, street addresses, PO boxes, standalone ZIPs) and any question that still carries a redaction marker or names a person (possessive name, honorific, "customer named") is answered locally with a refusal — no DB, no model. Prompt rules cannot un-send input. Standalone 5-digit redaction is question-only so audit findings keep their counts.
- **Dedupe against the stored backlog.** Every audit re-proposes the same SEO/funnel/ad ideas unless the prompt includes the current backlog values and the executor skips actions equal to the stored setting.
- **Keep policy refresh separate from the records audit.** The main audit is intentionally records-only; current Google/Bing/social policy evidence needs its own web-search call with primary-source citation verification, or policy backlogs become guesses.

**Why:** The first audits produced "2.2 s TTFB" and "images not cacheable" findings that were environment artifacts, and competitor snapshots were marked unverified despite real searches.
