# Staging validation report

## Build and dependency checks

- The consolidated pnpm workspace lockfile was regenerated for the imported app; frozen install/linking completed with pnpm 11.25.0. `esbuild` was explicitly approved for its expected install build; other lifecycle scripts remained disabled under the sandbox's strict pnpm policy.
- Root workspace typecheck passed for the API, Tessera web, UI sandbox, Vitality Supply, shared libraries, and scripts.
- Full monorepo production build passed with the Tessera-required `PORT=3000` and `BASE_PATH=/`. Vite emitted a large-chunk warning for the Tessera client bundle; builds otherwise completed.
- Vitality Supply's own build passed. Its test script completed without failures; database-backed cases were skipped when no app database was configured.
- Tessera API tests passed against a throwaway local PostgreSQL database with a synthetic chart fixture: 13 test files, 94 passed, 1 skipped.
- The legacy storefront's `npm ci` and typecheck passed after its stale lockfile was regenerated and seven inaccessible Replit-internal tarball URLs were changed to public npm registry URLs. Its tests retain the known baseline: 182 passed, 13 failed of 195. Failures are legacy template/environment expectations noted in the historical verification record; they are not represented as passing.

Validation used Node.js 22.13.0 in this sandbox, while the source workspace documents Node.js 24. Re-run the complete checks with the production Node/pnpm versions before a production deployment.

## Credential and privacy checks

- A redacted pattern scan over 1,929 staged text files found **no credential-pattern matches** (private-key blocks, common provider tokens, JWT-shaped values, credential URLs, or high-entropy credential assignments). The blank `.env.example` is safe to track; actual `.env*`, private-key, and credential files are ignored.
- The OCR pipeline processed 493 deduplicated image contents, retained OCR text from 465, omitted six images with personal-record indicators, and masked 98 text items/lines. No raw non-runtime source screenshots were added.
- A separate email/phone/address pattern scan produces expected matches in code examples, tests, and public business-contact fields. The business identity/contact values in `artifacts/vitality-supply/src/lib/business.ts` and `projects/vitality-chems-storefront/src/lib/business.ts` are retained verbatim for app behavior. Confirm that these are intended for public repository visibility before changing the private repository to public.
- The unreviewed user-pasted text, dated `replit.md` notes, and path-level raw-media inventory containing user-supplied filenames are omitted or summarized. The protected `1T` contents and browser-profile/session data were not imported.

## Release blockers

This report verifies the staged code snapshot, not every historical ref, uncommitted workspace, agent branch, or deployment secret. Some source-agent sign-offs and source-scope discrepancies remain unresolved. No old source repository was modified or deleted. The new repository should stay private until the owner reviews the exact public payload and confirms the contact-data choice.
