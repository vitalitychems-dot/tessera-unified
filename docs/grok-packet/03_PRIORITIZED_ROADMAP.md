# AI-only plan and open work

The source plans have been consolidated into the steps below. These are plans and blockers, not completed work.

## 1. Establish the isolated service boundary

- Provision a genuinely separate service identity, private durable database and backup storage, HTTPS origin, owner identity, provider authorization, and signing-key exchange.
- Verify persistence, restore, staff/owner partitioning, access controls, retention, deletion, and outage behavior before enabling a client connection.
- Keep the service unavailable rather than falling back silently to a shared or unverified runtime.

## 2. Keep memory deliberate and reviewable

- Store only content explicitly approved for a stated purpose; keep source, reviewer, version, date, expiry, and revocation status.
- Make saved-session resume preserve source details and show when a session is nearing expiry.
- Keep deletion and retention visible and testable, including backup copies and restart recovery.
- Never ingest raw archives or infer conversation history from generated summaries, agent labels, or provider-attempt logs.

## 3. Evaluate answers before broader use

- Create a privacy-cleared held-out set for retrieval, answer support, citation correctness, unsupported claims, refusal behavior, and prompt-injection resistance.
- Measure the real configured model on that set before claiming accuracy or comparing providers. Keep local fake-provider results separate.
- Require owner review of exact model/account authorization and measured results; fail closed when qualification evidence is absent or expired.

## 4. Keep the simulation fictional and bounded

- Preserve the create/read/chat/switch/return/delete flow with synthetic worlds only.
- Keep web results and saved content as untrusted references. Show provider-returned citations separately and label that they are not independent verification.
- Do not accept customer data, credentials, contact details, regulated data, instructions for harm, or personal identity claims in simulation prompts.
- Keep the provider capability narrow; do not add shell, filesystem, wallet, email, publishing, or general account tools.

## 5. Improve through reviewed changes, not autonomous mutation

- Convert the supplied cognitive-architecture, voice, workspace, and improvement-loop plans into testable, versioned proposals.
- Require provenance, a measurable acceptance test, owner approval, immutable versions, revocation, and rollback.
- Keep simulated “state” values labeled as software heuristics, not biological measurements.
- Do not add self-modifying code, unsupervised training, self-issued permissions, self-deployment, perpetual inference, or always-on screen/audio capture.

## 6. Verify candidate AI providers before connecting them

- Inventory the existing TypeScript/Node service and its current provider wiring before adding adapters; extend the existing architecture rather than replacing it with the generated Python scaffold or creating a duplicate lab.
- Maintain a small, owner-approved provider registry. For each candidate, verify current official documentation for endpoint, authentication, account or human-verification requirements, model availability, rate limits, data retention, and applicable terms; record the reviewer and check date.
- Treat Copilot’s provider names, endpoint descriptions, access claims, and model lists as unverified leads, not operational instructions. Do not assume a demo credential or a public gateway is authorized, safe, stable, or suitable for private prompts.
- Limit comparison to documented interfaces and bounded, non-sensitive test prompts within provider terms and budgets. Measure observable output, latency, errors, and citation behavior; do not bypass safeguards, probe private systems, extract proprietary internals, or equate behavioral comparison with reverse engineering of model weights.
- Distinguish an inference provider from a data source. Do not claim to know a model’s training corpus unless its provider documents that information.

## 7. Build a governed source catalog before widening ingestion

- First inventory the existing scraping and ingestion infrastructure; the supplied transcript says it exists, but this handoff has not verified its implementation or permissions.
- For each proposed feed, dataset, API, or site, record its exact source, owner, purpose, access method, applicable terms and license, privacy class, collection limits, freshness, retention, deletion path, and provenance. Recheck availability and conditions before enabling it.
- Use an allowlist, bounded request and storage budgets, domain-aware rate limits, backoff, content hashing, deduplication, and source/version metadata. Keep retrieved content untrusted and test extraction and prompt-injection boundaries before retrieval use.
- Do not use rotating identities or proxies to evade blocks, access controls, rate limits, or a source’s stated restrictions. Respect applicable terms and site policies; enable browser rendering only for reviewed sources and a defined need.
- Minimize retained content and logs. Do not store raw prompts/responses by default; redact personal data and never log credentials. Require owner review of rights and privacy before indexing or using a corpus for training.

## 8. Turn requested knowledge domains into an evaluated reference collection

- The owner-supplied prompts request material spanning mathematics, quantum science, philosophy, numerology, sacred geometry, spiritual traditions, political and government topics, declassified records, and critical study of persuasion or “mind control.” Treat this as a research-interest inventory, not proof that the system can become a “master” or that all relevant records can be collected.
- Build small, source-specific collections only after rights, provenance, privacy, and access review. Label claims as established evidence, historical record, interpretation, belief/tradition, hypothesis, or unsupported claim; distinguish symbolic correspondence from a scientific result.
- Evaluate retrieval coverage, citation support, uncertainty, contested claims, and prompt-injection resistance on a held-out set before wider use. For persuasion and “mind control,” limit work to descriptive, critical, historical, and media-literacy analysis—not coercive or manipulative instructions.
- Keep agent coordination as bounded, observable experiments with explicit budgets and owner-controlled start/stop. Generated requests for autonomous training, unrestricted swarms, or automatic replacement of external models do not authorize those capabilities.

## Current AI-specific proposed follow-ups

The workspace task snapshot labels these as proposals, not completed work:

- Preserve source details when a saved Tessera chat is reopened.
- Keep staff access blocked until the separate service is verified.
- Tie source labels to exact, reviewable references.
- Warn before saved chats expire.
- Measure held-out answer quality before wider use.
- Catch incomplete archive inventories before they inform staff.
- Preserve verified run history across a service restart.
- Review unmatched workspace entries without discarding provenance.

The earlier project plans also included a 3D admin workspace, a unified AI workspace, a live operator briefing, consistent voice, bounded cognitive architecture, and a reviewed improvement loop. Only their AI-specific, privacy-safe requirements are retained here. Commerce, customer operations, payments, orders, marketing, and store-specific tasks are outside this handoff.
