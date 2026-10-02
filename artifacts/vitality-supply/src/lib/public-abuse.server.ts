import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getRequest } from "@tanstack/react-start/server";
import type { Sql } from "@/lib/db";

const WINDOW = "1 hour";
const TRUSTED_PROXY_RANGES = [
  { network: 0x23bf0000, mask: 0xffff0000 }, // 35.191.0.0/16
  { network: 0x82d30000, mask: 0xfffffc00 }, // 130.211.0.0/22
] as const;

function parseIp(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  return isIP(candidate) ? candidate : null;
}

function ipv4Number(ip: string): number | null {
  if (isIP(ip) !== 4) return null;
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) {
    return null;
  }
  return (
    (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0)
  );
}

function isTrustedProxy(ip: string) {
  const address = ipv4Number(ip);
  return address !== null && TRUSTED_PROXY_RANGES.some(
    ({ network, mask }) => ((address & mask) >>> 0) === network,
  );
}

function ipv4Octets(value: string): number[] | null {
  const octets = value.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return null;
  }
  return octets;
}

function ipv6Words(ip: string): number[] | null {
  let value = ip.toLowerCase();
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const octets = ipv4Octets(value.slice(lastColon + 1));
    if (lastColon < 0 || !octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${value.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (half: string) => {
    if (!half) return [];
    const words = half.split(":");
    if (words.some((word) => !/^[0-9a-f]{1,4}$/.test(word))) return null;
    return words.map((word) => Number.parseInt(word, 16));
  };
  const left = parseHalf(halves[0] ?? "");
  const right = parseHalf(halves[1] ?? "");
  if (!left || !right) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function canonicalCallerIdentity(ip: string): string {
  if (isIP(ip) === 4) return `ip:${ip}`;
  const words = ipv6Words(ip);
  if (!words) return `ip:${ip.toLowerCase()}`;

  // IPv4-mapped IPv6 addresses must share the exact IPv4 bucket.
  if (
    words.slice(0, 5).every((word) => word === 0) &&
    words[5] === 0xffff
  ) {
    return `ip:${[words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff].join(".")}`;
  }

  // A normal IPv6 subscriber can rotate interface identifiers inside its /64.
  return `ipv6:${words.slice(0, 4).map((word) => word.toString(16)).join(":")}/64`;
}

/**
 * Replit's production frontend appends the client address and its own Google
 * frontend address to X-Forwarded-For. Walk from the trusted proxy inward so
 * a caller cannot prepend a fake address and choose its own budget bucket.
 */
export function forwardedClientIp(headers: Headers): string | null {
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map(parseIp)
    .filter((ip): ip is string => Boolean(ip));
  if (!chain.length || !isTrustedProxy(chain[chain.length - 1])) return null;
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const ip = chain[index];
    if (ip && !isTrustedProxy(ip)) return ip;
  }
  return null;
}

export function requestIdentityFromHeaders(headers: Headers): string {
  const clientIp = forwardedClientIp(headers);
  // Do not fingerprint attacker-controlled headers. A fixed fallback is
  // deliberately conservative and cannot create unbounded limiter rows.
  return clientIp ? canonicalCallerIdentity(clientIp) : "untrusted-request";
}

function requestIdentity(): string {
  let request: Request | undefined;
  try {
    request = getRequest();
  } catch {
    // Direct server-side calls do not have request context. They are not public
    // callers, but still get a bounded fallback if one is needed.
  }
  if (!request) return "no-request-context";
  return requestIdentityFromHeaders(request.headers);
}

/**
 * Analytics session identity is derived on the server from the trusted proxy
 * identity and an HMAC. The browser's sessionId is intentionally not used for
 * qualifying traffic, so one caller cannot create many fake sessions.
 */
export function requestAnalyticsSessionId(): string {
  const secret =
    process.env.BETTER_AUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("A session secret is required for analytics provenance.");
  }
  return `server-${createHmac("sha256", secret)
    .update(`analytics-session:v1:${requestIdentity()}`)
    .digest("hex")}`;
}

function requestKey() {
  const secret =
    process.env.BETTER_AUTH_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("A session secret is required for public abuse budgets.");
  }
  return createHmac("sha256", secret)
    .update(`public-abuse:v2:${requestIdentity()}`)
    .digest("hex");
}

export async function consumePublicBudget(
  sql: Sql,
  action: string,
  maximum: number,
) {
  const key = requestKey();
  const rows = await sql<{ action: string }>`
    insert into public_action_limits (
      action, request_key, window_started_at, request_count, last_request_at
    ) values (${action}, ${key}, now(), 1, now())
    on conflict (action, request_key) do update set
      request_count = case
        when public_action_limits.window_started_at < now() - ${WINDOW}::interval then 1
        else public_action_limits.request_count + 1
      end,
      window_started_at = case
        when public_action_limits.window_started_at < now() - ${WINDOW}::interval then now()
        else public_action_limits.window_started_at
      end,
      last_request_at = now()
    where public_action_limits.window_started_at < now() - ${WINDOW}::interval
      or public_action_limits.request_count < ${maximum}
    returning action
  `;
  if (!rows[0]) return false;
  // Cleanup runs only inside an already-granted caller budget. Limited batches
  // prevent stale email/session limiter keys from accumulating indefinitely
  // without turning a denied request into database work.
  await sql`
    with
      old_public as (
        select ctid from public_action_limits
        where last_request_at < now() - interval '2 hours' limit 100
      ),
      prune_public as (
        delete from public_action_limits where ctid in (select ctid from old_public)
      ),
      old_events as (
        select ctid from public_event_limits
        where last_event_at < now() - interval '2 hours' limit 100
      ),
      prune_events as (
        delete from public_event_limits where ctid in (select ctid from old_events)
      ),
      old_newsletter as (
        select ctid from newsletter_request_limits
        where last_requested_at < now() - interval '1 day' limit 100
      ),
      prune_newsletter as (
        delete from newsletter_request_limits where ctid in (select ctid from old_newsletter)
      ),
      old_wholesale as (
        select ctid from wholesale_lead_keys
        where last_submitted_at < now() - interval '31 days' limit 100
      ),
      prune_wholesale as (
        delete from wholesale_lead_keys where ctid in (select ctid from old_wholesale)
      ),
      old_coa as (
        select ctid from coa_request_limits
        where last_submitted_at < now() - interval '31 days' limit 100
      )
    delete from coa_request_limits where ctid in (select ctid from old_coa)
  `;
  return true;
}

/**
 * Public server actions may use the caller-bound budget without receiving a
 * database handle or selecting a table. Keep the SQL boundary here so callers
 * cannot accidentally mix public abuse controls with private data.
 */
export async function consumePublicActionBudget(action: string, maximum: number) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  return consumePublicBudget(sql, action, maximum);
}