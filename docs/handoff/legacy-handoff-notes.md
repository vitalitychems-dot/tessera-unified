<!-- Combined handoff copy. Historical notes from the prior public repository; claims and source descriptions are not independently verified. Personal names and IP literals found by the handoff scrub were redacted. -->

# Tessera: purpose, current state, and path forward

This repository contains a privacy-screened Tessera/Grok handoff and a separate raw ZIP that was not screened. The raw ZIP is not part of the reviewed snapshot; see “Separate raw archive (unreviewed).” Neither artifact is a live service, complete workspace export, approved training corpus, or proof that every historical claim is true.

## The idea

Based on the included project brief, the most supportable version of the idea is an owner-controlled AI project with two separate, clearly bounded parts:

1. **A reference assistant** that answers from owner-reviewed, versioned sources; shows evidence and citations; communicates uncertainty and provider failures; and keeps only context approved for a specific purpose.
2. **A fictional simulation space** where generated characters and events can be created, saved, explored, and deleted. Its stories are application-generated content—not evidence of independent people, a continuing mind, or real conversations.

The supplied plans also express interest in a consistent, warm voice; useful context between sessions; multimodal and cognitive-architecture research; self-review; and suggestions for improvement. These are goals to explore and test, not capabilities established by this handoff. The safer direction is to make proposed improvements reviewable and owner-approved, rather than letting the system modify or deploy itself.

Some earlier plans mention storefront and business operations. This public Tessera/Grok handoff deliberately excludes customer, account, order, checkout, payment, email, and visitor-derived data, along with code and service paths that can access it. The project brief also leaves open what “sovereignty” should mean in measurable terms; it does not establish that the system must be self-hosted or must use an external model.

## What the snapshot supports

The project-status document is dated **September 30, 2026**. It records:

- Source for a separate Node service, including owner/staff checks, private-storage code, reviewed knowledge, bounded provider calls, and a limited read-only site probe.
- Source for a synthetic simulation lifecycle, including create, load, chat, mode switching, return-home, and delete flows.
- An xAI/Grok adapter designed for a fixed provider endpoint, bounded structured output, web search, and provider-returned citations.
- A prior local test/typecheck/build report. Those are local checks, not evidence of live service operation or model quality; this handoff did not independently rerun them.

The handoff does **not** verify an independent deployment, private durable hosting or backups, live provider authorization or calls, citation correctness, answer quality, or reliable deployed deletion and retention. The safe simulation-gateway excerpt is incomplete, expects an injected Tessera-owned store, and is not a runnable service. No fine-tuning corpus has been approved or used. Nothing here establishes consciousness, biological equivalence, independent agency, or a persistent self.

Six accessible supplied Drive archives, about 4.98 GB combined, were inventoried: 179,907 entries. A targeted text-file selection yielded 65 candidates and 48 unique content groups; only bounded previews were reviewed, not every file or archive entry. One of seven supplied Drive IDs returned 404 for an unresolved reason. A separate earlier conversation-shaped review of five archives found 636 reviewed occurrences and 610 unique hashes, with no complete provider-linked human/model turn verified. Neither review proves that no such material exists elsewhere.

## What is included

The two curated reconstructed archives contain **848 file entries**:

- `grok-handoff.zip`: 714 entries—713 package files plus its SHA-256 manifest.
- `grok-handoff-images.zip`: 134 entries—132 PNG originals, a README, and a PNG manifest.

Together they contain the project prompt, brief, implementation-status snapshot, prioritized roadmap, references and rights notes, a redacted source appendix, a scoped archive review and claim register, an allowlisted set of source/document excerpts, selected static product and brand assets, and a link index for the included material. The bundle also has a SHA-256 manifest. The archives were checked for CRC errors and manifest mismatches; exact duplicate-content checking found no duplicate groups among the 848 files.

The curated packet is intentionally not a complete app or source export. It omits customer and payment data; credentials and environment values; private runtime stores, logs, and backups; private share identifiers; unreviewed archive contents; duplicate copies; and storefront-integrated or customer-data-connected implementation paths. The separate raw ZIP below was not screened and may contain any of these categories or other sensitive material; it does not expand the scope of the curated review.

## Link audit

Counts below are literal GitHub URL mentions in the **reconstructed archives**. “Direct content” excludes the generated `07_LINK_INDEX.md`; the index repeats links so it is reported separately. The repository count normalizes owner/repository paths and deduplicates repeats. A mention does not prove a link was opened, verified, endorsed, or used to train a model.

| Scope | Files containing GitHub repository links | GitHub URL mentions | Distinct URL strings | Distinct repositories |
| --- | ---: | ---: | ---: | ---: |
| Direct content, excluding the generated index | 5 | 80 | 42 | 33 |
| All files, including the generated link index | 6 | 160 | 42 | 33 |

The direct mentions are in `04_REFERENCES_AND_RIGHTS.md` (33), `06_SAFE_SOURCE_FILES/owner-history/direct-tessera-request.md` (2), and three files under `06_SAFE_SOURCE_FILES/user-provided-text/` (45 combined: 25, 12, and 8). `07_LINK_INDEX.md` repeats the 80 GitHub mentions in its generated entries. The index has **410 total target entries across all domains**; that is not 410 GitHub repositories. The 33-item repository list is deduplicated; topic and organization pages are not counted as repositories.

Google Drive and Google Docs URLs or IDs: **0 in the included packet**. Private or unreviewed links were deliberately not copied, so this does not describe every Drive file or link in the workspace.

## What to do to get there

Follow the included `03_PRIORITIZED_ROADMAP.md`. In practical order:

1. **Set a testable target.** Decide whether the first release is the source-grounded assistant, the fictional simulation, or both as separate experiences. Define what a good answer, a good citation, a safe refusal, and a successful simulation deletion mean.
2. **Prove the service boundary before enabling it.** Establish a genuinely separate service identity, private durable storage and backup, HTTPS, owner authentication, and tested access separation. Verify restore, retention, deletion, and outage behavior. Keep the service unavailable until those checks pass.
3. **Govern memory and sources.** Use only purpose-approved, privacy-cleared material. Track each source’s origin, exact version, rights/terms, reviewer, review date, retention/expiry, and revocation path. Do not treat raw archives, generated summaries, or simulated history as genuine memory or training data.
4. **Qualify the actual provider.** Confirm the chosen account, model, endpoint, data handling, and current provider terms. Test the real authorized provider on a privacy-cleared held-out set for answer support, citation correctness, uncertainty, refusal behavior, and prompt-injection resistance. Keep fake-provider tests separate from live-model results.
5. **Keep simulation fictional and tool access narrow.** Use synthetic worlds; label provider citations and generated content honestly; do not add customer data, arbitrary computer tools, self-modifying code, self-issued permissions, or self-deployment.
6. **Expand only through reviewed evidence.** Make voice, cognitive-architecture, and improvement ideas into versioned proposals with measurable acceptance checks, owner approval, and rollback. Begin any pilot with a narrow purpose and expand only after privacy, rights, reliability, and quality checks hold.

**Best next step:** write down the first release’s boundary and acceptance tests, then complete and verify the separate-service isolation work before connecting real private sources or relying on live provider behavior.

## Separate raw archive (unreviewed)

The repository also contains `grok-workspace_1789591148371.zip`, a separate 53,000,316-byte ZIP. It is not the approximately 3.4 GB Replit iPhone export. Its full contents were not screened before public upload. It may contain credentials, personal or customer data, private history, or other sensitive material. Do not treat it as part of the privacy-screened packet, a verified evidence source, or approved training data. Its ZIP bytes are preserved exactly across 26 numbered parts and can be reconstructed with `reassemble_handoff.py`. SHA-256: `5a10d393c4900d297008893ead0e1a963cb6b32ec83ef9389a71ec4822921123`.

## Download and integrity

The two curated archives and the separate raw ZIP are stored as numbered 2 MiB parts. Download this repository with **Code → Download ZIP** or clone it, extract the repository archive, then run:

```bash
python3 reassemble_handoff.py
```

The script rebuilds all three ZIP files and verifies their SHA-256 hashes. Extract the two curated archives into the same folder so the PNG originals merge at their indexed paths; keep the unreviewed raw archive separate.

- Main archive parts: 23
- Image companion parts: 30
- Unreviewed raw workspace archive parts: 26
- `grok-handoff.zip`: `5eb22d30dede86eab0b4bf9ebd664efc115f38cb21391c8fd4dfb35e7a5d6af8`
- `grok-handoff-images.zip`: `6fd76ff535819bdf50aacccc1ccb0bf557a514e78ae830861ce059fc6c3f37c6`
- `grok-workspace_1789591148371.zip` (unreviewed): `5a10d393c4900d297008893ead0e1a963cb6b32ec83ef9389a71ec4822921123`

The archives use standard lossless ZIP/Deflate compression at level 9. PNG and WebP assets are already compressed, so additional savings are limited; image content was not changed. The files are **not encrypted** because this repository is public. SHA-256 checks detect corruption, not disclosure.

## Rights and interpretation

References identify leads, not endorsements, factual validation, or reuse permission. This repository grants no license to third-party code, text, images, models, or datasets. Generated content and provider-returned citations are not independent verification. Read `04_REFERENCES_AND_RIGHTS.md` and `08_SCOPE_AND_OMISSIONS.md` before reusing material.
