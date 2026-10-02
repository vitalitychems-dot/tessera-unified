import { getRequest } from "@tanstack/react-start/server";
import { isSiteHostname } from "./site-hosts.server";

/**
 * Fetch-Metadata sibling isolation — **server-only** (`.server.ts` suffix).
 *
 * MUST keep the `.server` suffix: this file imports `@tanstack/react-start/server`
 * (`getRequest` → Node `AsyncLocalStorage`). If it is imported from a dual
 * client/server module under a non-`.server` name, Vite ships it to the browser
 * and the app dies with: `AsyncLocalStorage is not a constructor`.
 *
 * Replit previews are embedded cross-origin and deployed apps can use either a
 * Replit host or the custom domain. Origin/Referer checks therefore accept the
 * explicit hosting allowlist while rejecting unrelated scripted requests.
 *
 * We allow only: same-origin requests (this app's own client), non-browser
 * requests (SSR / server-to-server, which send no `Sec-Fetch-Site`), and
 * top-level GET navigations (how the OAuth callback and normal page loads
 * arrive). Every cross-site / same-site *scripted* request is rejected.
 * Better Auth also performs its own trusted-origin checks on auth endpoints.
 * This guard is enforced at the `authMiddleware` chokepoint.
 */
export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

/** Throw `CrossSiteRequestError` for a scripted cross-site/sibling request. */
export function assertSameSiteRequest(): void {
  const request = getRequest();
  if (!request) return; // no request context (e.g. build) — nothing to guard
  const h = request.headers;
  const site = h.get("sec-fetch-site");
  // Non-browser client (no header), the app's own origin, or a direct
  // (address-bar/bookmark) load are all fine.
  if (!site || site === "same-origin" || site === "none") return;

  const requestHost = forwardedHost(h) ?? new URL(request.url).host;
  const source = h.get("origin") ?? h.get("referer");
  if (source) {
    try {
      const sourceHost = new URL(source).host;
      if (
        sourceHost === requestHost ||
        isAllowedHost(sourceHost, new URL(source).protocol)
      ) {
        return;
      }
    } catch {
      // A malformed source header is not trusted.
    }
  }
  // A top-level GET navigation (e.g. the broker's OAuth callback redirect) is
  // fine even when it's cross-site; scripted requests never set navigate mode.
  const dest = h.get("sec-fetch-dest");
  const isTopLevelGet =
    h.get("sec-fetch-mode") === "navigate" &&
    request.method === "GET" &&
    dest !== "object" &&
    dest !== "embed";
  if (isTopLevelGet) return;
  throw new CrossSiteRequestError();
}

function forwardedHost(headers: Headers): string | null {
  return (headers.get("x-forwarded-host") ?? headers.get("host"))
    ?.split(",")[0]
    ?.trim() || null;
}

function isAllowedHost(hostWithPort: string, protocol: string): boolean {
  const hostname = hostWithPort.replace(/:\d+$/, "").toLowerCase();
  if (isSiteHostname(hostname)) {
    return protocol === "https:";
  }
  return (
    protocol === "http:" &&
    (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]")
  );
}
