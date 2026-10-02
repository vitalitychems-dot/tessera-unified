# TX — Tessera

TX is the shared public repository for the Tessera project. `main` is the canonical source of truth.

## Agent collaboration

- Start from the latest `main`; use a short-lived branch for each change and merge without force-pushing.
- Keep generated audit records, local data and vaults, credentials, and other private material out of commits.
- When another agent has updated `main`, sync before pushing your next change.
