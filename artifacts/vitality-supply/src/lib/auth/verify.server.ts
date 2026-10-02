import { getRequest } from "@tanstack/react-start/server";
import { auth, authConfigured } from "./server";

/**
 * Server-side session resolution (server-only).
 *
 * Because this app runs its OWN Better Auth at same-origin `/api/auth/*`, the
 * session cookie is sent with every request to this app — server functions AND
 * SSR loaders included. So we resolve the user straight from the request cookies
 * via `auth.api.getSession` (no client-minted JWT needed). Never trust a
 * client-supplied user id — only the result of this verification.
 */

/** True when a real database is configured server-side. */
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/** Re-export so callers can branch on it without importing `server.ts`. */
export { authConfigured };

if (databaseConfigured && !authConfigured) {
  console.error(
    "[auth] DATABASE_URL is set but auth is incomplete — " +
      "requireUserId() will reject every request (fail closed) rather than share " +
      "one dev user on a real database.",
  );
}

/**
 * Thrown by `requireUserId` when the caller has no valid session. Carries
 * `status: 401`; the message is a stable contract — match
 * `err.message === "Unauthorized"` client-side to send the visitor to sign-in.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** Thrown when an authenticated account has not proved ownership of its email. */
export class EmailVerificationRequiredError extends Error {
  readonly status = 403;
  constructor() {
    super("Email verification required");
    this.name = "EmailVerificationRequiredError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * Resolve the signed-in user from the current request, or `null` when auth isn't
 * configured / nobody is signed in. Safe to call from server functions and SSR
 * loaders.
 *
 * `bearerToken` is for the LIVE PREVIEW: the app runs in a partitioned iframe
 * whose cookies don't reach the server, so `authMiddleware` forwards the session
 * as a bearer token, which we present as `Authorization: Bearer …` (the `bearer`
 * plugin resolves it). When deployed no token is passed and the cookie is used.
 */
export async function getSessionUser(
  bearerToken?: string,
): Promise<VerifiedUser | null> {
  if (!authConfigured) return null;
  const request = getRequest();
  if (!request) return null;
  let headers = request.headers;
  if (bearerToken) {
    headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

/**
 * Resolve the current user id for a server function, or throw when unauthorized.
 * Prefer `authMiddleware` (`./middleware`), which calls this for you.
 * - Auth enabled -> the verified session user id; throws
 *   `UnauthorizedError` when signed out. Works in the sandbox preview too (real
 *   email/password sign-in via a cookie or bearer token).
 * - Auth disabled or unconfigured -> throw explicitly. There is no shared
 *   development identity.
 */
export async function requireUserId(bearerToken?: string): Promise<string> {
  if (!authConfigured)
    throw new Error(
      "Authentication is not configured. Set DATABASE_URL and SESSION_SECRET (or BETTER_AUTH_SECRET).",
    );
  const user = await getSessionUser(bearerToken);
  if (!user) throw new UnauthorizedError();
  return user.id;
}

/**
 * Authorize access to account data that can contain contact details, order
 * history, credits, or business information. A valid session alone is not
 * enough: the Better Auth user's persisted verification flag must be true.
 */
export async function requireVerifiedUser(userId: string): Promise<VerifiedUser> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ id: string; email: string | null; emailVerified: boolean }>`
    select id, email, "emailVerified"
    from "user"
    where id = ${userId}
    limit 1
  `;
  const user = rows[0];
  if (!user || user.emailVerified !== true) {
    throw new EmailVerificationRequiredError();
  }
  return { id: user.id, email: user.email };
}
