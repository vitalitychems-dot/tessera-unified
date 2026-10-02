# Secrets and runtime configuration

This repository is intended to be public. **Do not commit real credentials, private keys, passwords, tokens, personal chart data, or populated `.env` files.** Public Git history and mirrors are difficult to retract even after a value is rotated.

## Local development

1. Copy `.env.example` to `.env.local` (ignored by Git).
2. Put fresh values in `.env.local` or inject them into the process using a local secret manager.
3. Never paste values into issues, commits, screenshots, or task notes.

## GitHub and deployment

- For GitHub Actions, add values under **Settings → Secrets and variables → Actions** and reference them through `${{ secrets.NAME }}` in workflow YAML. Do not put secret values in workflow files or repository variables.
- For a deployed app, configure values in the hosting provider's environment/secret settings for each environment. Do not expose server-only values through `VITE_*` or another client-side variable prefix.
- Use separate least-privilege credentials for local development, CI, preview, and production. Rotate a value immediately if it was ever committed or published.

## Important values

The active Tessera API uses `DATABASE_URL`, admin/session keys (`TESSERACT_ADMIN_KEY`, `SIGIL_ADMIN_KEY`, `SOVEREIGN_ADMIN_TOKEN`, `SESSION_SECRET`), and optional AI/Modal integration values. The root development supervisor auto-starts the API only when `DATABASE_URL` is local/loopback; it never forwards that URL to either storefront. Storefronts use separate optional local values, `VITALITY_SUPPLY_DATABASE_URL` and `VITALITY_STOREFRONT_DATABASE_URL`. `FATHER_NATAL_CHART_JSON` is owner-private personal data, not a public configuration literal; leave it blank in the template and supply it privately only if that feature is enabled.

Database-backed API tests are opt-in through `TESSERA_TEST_DATABASE_URL`, which must point to a dedicated local test database. The test runner refuses remote database hosts and does not reuse `DATABASE_URL`. Never aim test commands at production or a database containing user/customer data.

The Vitality Supply and legacy storefront sources may need auth/payment credentials. Names in `.env.example` are intentionally empty and are not usable credentials. Confirm which provider features are enabled before setting any values. Never reuse example credentials copied from source archives.

## Additional configuration names

The code also uses non-secret settings, including `PORT`, `BASE_PATH`, `VITE_API_URL`, `OLLAMA_ENDPOINT`, `VLLM_ENDPOINT`, `LLM_TIMEOUT_MS`, `SITEMAP_LASTMOD`, and `REPL_ID`. Consult the app code for optional feature-specific settings; add new values to a secret manager or deployment settings, not to committed configuration.
