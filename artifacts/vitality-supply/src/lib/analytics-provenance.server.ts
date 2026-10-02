import { getRequest } from "@tanstack/react-start/server";

const AUTOMATION_USER_AGENT =
  /\b(?:headlesschrome|playwright|puppeteer|cypress|selenium|webdriver|lighthouse)\b/i;

function configuredExcludedIps() {
  return new Set(
    (process.env.ANALYTICS_EXCLUDED_IPS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function requestIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    ""
  );
}

/**
 * Provenance is server-owned. Published traffic is live by default, but known
 * browser automation and explicitly configured internal/test IPs remain test
 * traffic so QA can never create a false funnel.
 */
export function getAnalyticsProvenance(): "live" | "test" {
  const mode = process.env.ANALYTICS_MODE?.trim().toLowerCase();
  if (mode === "test") return "test";

  const isPublished = mode === "live" || process.env.NODE_ENV === "production";
  if (!isPublished) return "test";

  try {
    const request = getRequest();
    if (request) {
      const userAgent = request.headers.get("user-agent") ?? "";
      const ip = requestIp(request.headers);
      if (AUTOMATION_USER_AGENT.test(userAgent) || configuredExcludedIps().has(ip)) {
        return "test";
      }
    }
  } catch {
    // A missing request context is normal for server-side callers. Keep the
    // deployment-level provenance rather than making a browser-provided claim.
  }

  return "live";
}