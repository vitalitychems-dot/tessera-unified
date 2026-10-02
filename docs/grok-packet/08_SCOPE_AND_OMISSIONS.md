# Scope, screening, and omissions

## Current owner boundary

Do not retrieve, inspect, include, store, transmit, or process website customer information or payment-card information. Do not add or use a connection to customer records, communications, accounts, orders, checkout, payment, or visitor-derived analytics, including aggregates. The latest boundary overrides any older request for a website chatbot, manager, or storefront connection.

Credentials, private keys, environment values, runtime databases, logs, backup files, and certificate/key stores are excluded. Do not ask Grok to request these or to follow unreviewed private links.

## Included scope

- Reviewed Tessera handoff documents and one redacted supplied conversation transcript.
- A redacted, topic-scoped summary of a second user-supplied text, with source claims explicitly marked unverified; it is not a verbatim transcript.
- A sanitized historical Tessera request, with private preview URL removed and the superseding boundary stated.
- Three screened AI/Tessera prompt files.
- A standalone simulation-provider excerpt and controlled test, not a complete or runnable service.
- Two additional screened source excerpts from the standalone Tessera service: its simulation gateway and package metadata. The gateway uses an injected Tessera-owned store and can send owner prompts and approved source text to a configured provider; production isolation is unverified.
- An isolated design mockup and selected static public product/brand imagery. PNG product originals are in the companion image ZIP at matching paths; WebP variants are in the main ZIP.
- An index of link targets found in included text and source files.
- A bounded inventory and claim register for six accessible Drive archives; only selected text previews were screened, not every archive entry.

## Excluded material

- The uploaded workspace ZIP, which was not safely filterable as a whole.
- The six complete Drive archives, all raw archive files, and all unreviewed archive contents; the selected-preview review is not a full semantic review. One of seven supplied Drive IDs was unavailable with a 404.
- Private archive/review ledgers and unreviewed source inventories that expose user-supplied file identifiers, private links, or operational details.
- Finance, trading/scalping, market-scraping, deep-web collection, unrelated product work, personal contact values, credential-like strings, private URLs, and source identifiers from the additional text attachment.
- Storefront source paths for account, customer support, order, checkout, payment, session, analytics, admin, or manager-observation flows. This also excludes visitor-derived aggregate data and any source that can query those systems.
- The standalone service router, persistence layer, database/store, knowledge and history surfaces, manager bridge, automation runtime, credentials/configuration, backups, and logs. The remaining source paths were excluded where they read or write private conversation/source data, project storefront data, or backup state.
- Customer-facing, administrative, account, payment, credential/configuration, or otherwise unreviewed screenshots.
- COA scans, customer records, personal/contact data, and any file with unresolved privacy or provenance concerns.
- Unreviewed private URLs and URLs found only in excluded content.
- A complete account chat export, which is not available in the workspace.

## Completeness and provenance limits

This is not a verbatim export of the full Replit account, all conversations, all workspace files, or all attachments. It contains reviewed Tessera/Grok material that passed this bundle's screening; unreviewed or privacy-sensitive material remains excluded rather than being treated as safe. The supplied transcript and copied prompts lack authenticated speaker metadata and may contain nested third-party text. The link index covers included text/code and the static image index only; it does not claim to index excluded archives, inaccessible shares, or text embedded in images. Extract the companion image ZIP alongside the main handoff before following local product-image paths.

Code presence, local tests, and documentation do not establish live provider access, independent deployment, real-world model quality, source rights, or current runtime behavior. Grok must preserve those distinctions and must not claim changes were made unless it can inspect and verify them.