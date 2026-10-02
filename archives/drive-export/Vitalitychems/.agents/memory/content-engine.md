---
name: Organic content engine safeguards
description: Non-obvious runtime and model-gating rules for the autonomous SEO content engine.
---
Scheduler-reachable modules must use the server-safe site URL helper rather
than importing the browser-facing SEO module.

**Why:** Scheduler scripts run through `tsx`, where `import.meta.env` is
undefined even though it is available in the Vite application bundle.

**How to apply:** Keep URL normalization in a runtime-neutral module and pass
site metadata into structured-data builders rather than importing Vite-bound
modules.

Generated content is publishable only when both the deterministic policy gate
and the model self-audit pass. Audit only authored prose against the exact
writer brief and supplied facts; count only findings whose explicit
`violates` flag is true.

**Why:** Small models over-flagged neutral class labels and supplied catalog
facts, and hedged in explanatory text while returning contradictory verdicts.
The full audit model plus a reason-before-verdict schema produced stable,
concrete decisions without weakening compliance.

**How to apply:** Keep one full-model audit call per candidate page, reject
non-compliant verdicts that contain no concrete violation, and never infer a
pass from an empty or malformed response.

Writers must never narrate their prompt, source brief, supplied facts, or
missing fields. Deterministically reject that meta-commentary before audit.

**Why:** Retry prompts occasionally produced phrases such as “was not
supplied,” exposing generation instructions in public copy.

**How to apply:** Omit unknown fields from briefs, instruct the writer not to
mention omissions, and keep meta-commentary patterns at the start of the
deterministic ruleset.

Server-function responses used by the admin content panel must be plain
serializable data.

**Why:** TanStack Start serializes server-function results across the network;
error instances and nested provider objects can fail or lose fields.

**How to apply:** Flatten summaries and details into strings, numbers,
booleans, arrays, and plain objects before returning them to the client.

Model-call budgets must be reserved atomically before provider calls, and each
reservation must carry the UTC budget day used for accounting.

**Why:** Read-then-reset rollover lets concurrent callers erase each other's
usage at midnight, while a late refund from the previous day can otherwise
subtract new-day calls and reopen capacity.

**How to apply:** Combine rollover and cap enforcement in one row update,
conditionally reset standalone state reads, and refund only while the stored
budget day still matches the reservation day. Keep the full reservation when
provider usage is ambiguous.