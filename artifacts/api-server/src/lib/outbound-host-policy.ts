import { logger } from "./logger";

const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1|fc|fd|::ffff:)/i;

const DEFAULT_ALLOW: ReadonlyArray<RegExp> = [
  /^(www\.)?reddit\.com$/i,
  /^api\.github\.com$/i,
  /^github\.com$/i,
  /^raw\.githubusercontent\.com$/i,
  /^slickdeals\.net$/i,
  /^api\.mainnet-beta\.solana\.com$/i,
];

export interface OutboundHostPolicy {
  allowedHostPatterns: ReadonlyArray<RegExp>;
  validatorAllowAnyPublic: boolean;
}

const policy: OutboundHostPolicy = {
  allowedHostPatterns: DEFAULT_ALLOW,
  validatorAllowAnyPublic: true,
};

export function isAllowedOutboundUrl(rawUrl: string, opts: { mode: "strict" | "validator" } = { mode: "strict" }): { allowed: boolean; reason: string } {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { allowed: false, reason: "invalid-url" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { allowed: false, reason: `disallowed-scheme:${u.protocol}` };
  if (PRIVATE_HOST_RE.test(u.hostname)) return { allowed: false, reason: "private-host-blocked" };
  if (u.hostname === "metadata.google.internal" || u.hostname === "169.254.169.254") return { allowed: false, reason: "metadata-host-blocked" };
  if (opts.mode === "strict") {
    const ok = policy.allowedHostPatterns.some(re => re.test(u.hostname));
    if (!ok) return { allowed: false, reason: `host-not-in-allowlist:${u.hostname}` };
  } else if (opts.mode === "validator" && !policy.validatorAllowAnyPublic) {
    const ok = policy.allowedHostPatterns.some(re => re.test(u.hostname));
    if (!ok) return { allowed: false, reason: `host-not-in-allowlist:${u.hostname}` };
  }
  return { allowed: true, reason: "ok" };
}

export async function guardedFetch(url: string, init: RequestInit = {}, mode: "strict" | "validator" = "strict"): Promise<Response> {
  const decision = isAllowedOutboundUrl(url, { mode });
  if (!decision.allowed) {
    logger.warn({ url, reason: decision.reason }, "guardedFetch: blocked");
    throw new Error(`outbound-blocked:${decision.reason}`);
  }
  return fetch(url, init);
}
