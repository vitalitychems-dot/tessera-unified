# Authentication

Vitality Supply uses Better Auth with email and password. The app serves Better
Auth from `/api/auth/*` and stores users, password accounts, and sessions in the
configured Postgres database.

Browsers receive a secure, `SameSite=None`, partitioned session cookie. This
supports normal hosting and Replit's cross-origin preview iframe. The Better
Auth bearer plugin also returns a session token in `set-auth-token`; the client
stores it in local storage and sends it as an `Authorization: Bearer` header.
The bearer path keeps preview authentication working when third-party cookies
are blocked.

Required environment variables:

- `DATABASE_URL`
- `SESSION_SECRET` or `BETTER_AUTH_SECRET`
- `ADMIN_PASSWORD` to provision the staff account

`ADMIN_EMAIL` is optional and defaults to `vitalitysupply@icloud.com`.
`BETTER_AUTH_URL` is optional; request-derived origins are used when it is not
set.

On the first auth API request in each process, the app checks for the staff
email. If `ADMIN_PASSWORD` is absent it logs a warning and skips provisioning.
If the user exists it is left unchanged. Otherwise Better Auth creates the
password account and the app marks its email verified.

To rotate the staff password, sign in as the staff user and use the change
password form on the account page. Setting a different `ADMIN_PASSWORD` does
not reset an existing account.