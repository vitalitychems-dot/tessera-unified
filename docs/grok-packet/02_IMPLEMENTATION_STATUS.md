# Evidence and implementation status

**Snapshot date:** 2026-09-30. Source presence and local tests do not prove deployment or live provider behavior.

| Area | What the reviewed material supports | What remains unverified |
| --- | --- | --- |
| Separate service | A Node service package has a signed gateway, staff/owner checks, private SQLite storage code, versioned reviewed knowledge, bounded provider calls, and a limited read-only website probe. | No independent deployment, durable private volume, backup host/schedule, live gateway, or live provider response was verified. Do not describe it as running. |
| Synthetic simulation | Source implements create, load, chat, mode switching, return-home, and deletion for owner-partitioned fictional worlds. The service tests use a controlled fake generator and test access/version boundaries. | No real Grok request or deployed simulation was verified. Passing fake-provider tests is not a model-quality result. |
| Grok adapter | The source contains an xAI adapter configured for a fixed endpoint with web search, bounded structured output, and provider-returned citations. It rejects missing or incomplete evidence. | Provider credentials/account access, successful live calls, citation correctness, latency, and answer accuracy were not verified. |
| Simulation history | The local store gives simulation worlds an expiry and bounds the returned recent event window; the UI states that saved prompts and replies may remain for up to 365 days and that deleting a world removes its history. | This is source/UI behavior, not a verified deployed retention or deletion guarantee. Verify actual backup-copy expiry and restore behavior on any future host. |
| General service chat | The README describes a separate 30-day chat retention policy and a default of not saving provider-backed chat unless a separate consent flow exists. | Do not conflate this general chat policy with the simulation-world event retention described above. |
| Provider and data-source lists in supplied Copilot text | The transcripts contain proposed AI providers, gateways, local runtimes, public feeds, datasets, and scraping features. | No listed endpoint, quota, authentication requirement, data license, source permission, or availability was verified by those transcripts. Nothing in the lists is approved or connected by this handoff. |
| Requested research domains | The supplied prompts request research across scientific, mathematical, philosophical, cultural, political, intelligence-history, and esoteric topics. | The requests do not establish the truth of the claims in the transcripts, comprehensive archive access, expert capability, or a training corpus. |
| New source transcripts | Two supplied Copilot text attachments were reviewed and are reproduced in redacted form in `source-appendix.md`. | Their text has no authenticated role metadata; direct owner prompts are identified by conversational placement, and quoted/nested source material may have different authorship. They are not verified complete Copilot exports. |
| Training and archives | Fine-tuning has not been performed or justified. No archive record is approved as training data or remembered conversation. | No consented, redacted training corpus, measured fine-tuning benefit, or provider fine-tuning support was established. |
| Prior local checks | The previous work summary reports 45 standalone-service tests passing, a typecheck and production build passing, and a clean diff check. | The protected admin preview remained at staff-session loading. These checks do not establish browser completion, live service operation, or live model quality. |

## Archive review boundary

Five supplied Drive files were large ZIP archives (about 4.87 GB combined). Metadata was checked for all five. `Tx13.zip` and `8 2.zip` had complete member indexes and selected body reviews; selected member bodies from other archives were also reviewed in earlier work. The archives were not fully read or copied here.

Across two bounded conversation-shaped review batches, 636 selected body occurrences yielded 610 unique hashes. No complete, provider-linked human-to-model turn was verified among those reviewed candidates. This is not a claim that no authentic conversation exists anywhere in the unreviewed archive material. No raw chat, log, or synthetic transcript is approved for memory or training.

## Safe interpretation

“Configured,” “implemented,” “tested locally,” “provider-backed,” and “deployed” are different states. Report each separately. Local fake-provider tests validate contracts and boundaries only; a provider-returned citation is not independent verification; an approved permission is not evidence an action ran.

## Supplied transcript privacy and provenance review

The two pasted text attachments were scanned for the personal name used in the exchanges, email addresses, phone-like strings, credential assignments, and private-key headers. The name is replaced with `[name redacted]` in the public appendix; no email, phone number, credential assignment, or private-key header was found in these text files. This limited scan does not certify every embedded claim or every linked source.

The PDF captures reviewed with the supplied material were partial: one repeated an earlier PDF exactly, two were distinct clipped captures, and an earlier 853-byte PDF appeared blank on visual review. The duplicate is represented once; no missing conversation text is inferred from a clipped or blank capture.
