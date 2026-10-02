/**
 * Hostnames this storefront is legitimately served from — **server-only**.
 *
 * Better Auth rejects sign-in/sign-up requests whose Origin is not trusted, and
 * the sibling-isolation guard rejects scripted requests from unknown hosts. Both
 * lists must include every custom domain attached to the deployment, otherwise
 * login silently fails there with "Invalid origin" in the production logs.
 *
 * Production trusts EXACT hostnames only: the custom domains below plus the
 * domains Replit assigns to the deployment (`REPLIT_DOMAINS`). `*.replit.app`
 * and friends are public multi-tenant suffixes, so a suffix match would let any
 * other tenant's origin pass; the wildcard is a development convenience only.
 *
 * `CANONICAL_HOSTNAME` (vitalitychems.com) is the deployment's primary domain;
 * every other custom domain below 308-redirects to it in production.
 */
import { CANONICAL_HOSTNAME } from "@/lib/site-url";

const CUSTOM_HOSTNAMES = [
  CANONICAL_HOSTNAME,
  `www.${CANONICAL_HOSTNAME}`,
  "vitalitychem.com",
  "www.vitalitychem.com",
  "vitalitychem.replit.app",
];

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Domains Replit assigns to the running deployment or dev preview. */
function deployedHostnames(): string[] {
  return [process.env.REPLIT_DOMAINS ?? "", process.env.REPLIT_DEV_DOMAIN ?? ""]
    .join(",")
    .split(",")
    .map((entry) =>
      entry
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/[/:].*$/, ""),
    )
    .filter((hostname) => /^[a-z0-9.-]+$/.test(hostname));
}

export const SITE_HOSTNAMES: readonly string[] = Array.from(
  new Set([...CUSTOM_HOSTNAMES, ...deployedHostnames()]),
);

/** Wildcard host patterns for local development only (empty in production). */
export const DEV_HOST_PATTERNS: readonly string[] = IS_PRODUCTION
  ? []
  : ["*.replit.dev", "*.replit.app", "*.repl.co"];

/** True for an exact site hostname; in development also any Replit preview host. */
export function isSiteHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (SITE_HOSTNAMES.includes(h)) return true;
  if (IS_PRODUCTION) return false;
  return h.endsWith(".replit.dev") || h.endsWith(".replit.app") || h.endsWith(".repl.co");
}

/** Hostnames that permanently redirect to the canonical brand origin. */
const LEGACY_HOSTNAMES = new Set(
  CUSTOM_HOSTNAMES.filter(
    (hostname) => hostname !== CANONICAL_HOSTNAME && !hostname.endsWith(".replit.app"),
  ),
);

/** Permanently canonicalize legacy production domains, never local/dev hosts. */
export function canonicalProductionRedirect(request: Request): Response | undefined {
  if (!IS_PRODUCTION) return undefined;
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostname = (forwardedHost || url.host).toLowerCase().replace(/:\d+$/, "");
  if (!LEGACY_HOSTNAMES.has(hostname)) return undefined;
  // Assign path and query onto a fixed origin instead of resolving them as a
  // relative URL: a request path like `//evil.example/x` would otherwise be
  // parsed as protocol-relative and turn this into an open redirect.
  const target = new URL(`https://${CANONICAL_HOSTNAME}/`);
  target.pathname = url.pathname.replace(/^\/{2,}/, "/");
  target.search = url.search;
  // The origin is a fixed canonical allowlist value; only the normalized
  // path/query are copied onto it, so this cannot redirect to a new host.
  return Response.redirect(target, 308); // nosemgrep: javascript.express.web.tainted-redirect-express.tainted-redirect-express
}
