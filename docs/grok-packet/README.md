# Grok handoff packet

This is a screened Grok handoff for Tessera and non-sensitive project context. It includes the reviewed handoff, safe source files, selected user-provided documents, and a link index for included files.

The product-image PNG originals are in the companion `grok-handoff-images.zip`. Keep both ZIPs together and extract them into the same folder so the files merge into the indexed paths.

## Files

- `00_MASTER_INSTRUCTIONS_FOR_GROK.md` — the task prompt and evidence/safety boundaries.
- `01_PROJECT_BRIEF.md` — intended direction, evidence rules, and non-goals.
- `02_IMPLEMENTATION_STATUS.md` — what source and local tests support versus what is unverified.
- `03_PRIORITIZED_ROADMAP.md` — ordered build work and proposed follow-ups.
- `04_REFERENCES_AND_RIGHTS.md` — source inventory, review scope, and reuse boundaries.
- `05_SOURCE_APPENDIX.md` — one reviewed supplied conversation transcript, with personal-name redaction.
- `06_SAFE_SOURCE_FILES/` — allowlisted code, documentation, and static files; not a complete storefront source copy. The PNG originals are supplied separately.
- `06_SAFE_SOURCE_FILES/standalone-tessera-service/` — two additional screened source excerpts: the simulation gateway and package metadata. This is not a complete or runnable service.
- `07_LINK_INDEX.md` — URLs and link targets extracted from included text and source files, with file and line references.
- `08_SCOPE_AND_OMISSIONS.md` — screening rules, excluded content, and limits.
- `09_ARCHIVE_REVIEW_AND_CLAIMS.md` — bounded Drive-archive review, selected safe design proposals, and an explicitly unverified claim register.
- `MANIFEST.sha256` — checksums and byte sizes for every other included file.

## Coverage limits

This is not a verbatim export of the user's full Replit account or conversation history. It includes selected Tessera/Grok material available in the workspace, not every document, reference, private inventory, or runtime file. Six supplied Drive archives were inventoried, but only bounded previews of selected text candidates were reviewed; the raw archives and unreviewed content remain excluded. It does not include website customer information, payment-card information, any code/configuration that connects to those data, unreviewed customer-facing/admin screenshots, credential-bearing configuration, private runtime stores, or private review ledgers. Some supplied PDFs were partial, blank, or duplicates.

The source appendix and supplemental claim register do not authenticate speaker roles, prove that a transcript is complete, or validate embedded claims. The link index covers included files only; private, unreviewed links and links inside excluded material are not copied. Follow the master instructions and preserve unknowns rather than filling gaps with guesses.

The source folder is an allowlist, not a complete artifact copy. It contains an isolated mockup, selected static product/brand materials, a bounded provider adapter, and a limited simulation gateway excerpt. The gateway expects an injected Tessera-owned store and can send owner prompts and approved source text to a configured provider; it is not evidence of a deployed or isolated service. The packet excludes storefront and service paths that handle or can connect to customer, transaction, or visitor-derived data.

## Suggested use

Attach the files in the order listed in `00_MASTER_INSTRUCTIONS_FOR_GROK.md`. If Grok cannot inspect the live Replit workspace, it should return a plan and patch-ready changes without claiming they were applied. Do not ask for, inspect, or connect to website customer or payment-card data.