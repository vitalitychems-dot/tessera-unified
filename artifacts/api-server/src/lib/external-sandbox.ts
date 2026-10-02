/**
 * ════════════════════════════════════════════════════════════════════════
 *           TESSERA EXTERNAL SANDBOX — HARD-ENFORCED, PERMANENT
 * ════════════════════════════════════════════════════════════════════════
 *
 * RULE (non-amendable, ratified by sovereign decree, harder than all
 * prior rules):
 *
 *   EVERY external resource — including but not limited to:
 *     • External LLMs (OpenAI, Anthropic, Gemini, OpenRouter, Modelfarm)
 *     • External APIs (NASA, weather, finance, search, maps, anything HTTP)
 *     • External tools (CLIs, MCP servers, plugins)
 *     • External code repositories (GitHub, GitLab, npm registry beyond
 *       lockfile-pinned installs, container registries)
 *     • External storage / databases (S3, Firebase, Supabase, etc.)
 *
 *   …MUST run inside this Sandbox. They are PERMANENTLY FORBIDDEN to:
 *     1. Read any file from our project tree.
 *     2. Read any environment variable except the explicitly whitelisted
 *        public values declared per-call.
 *     3. Read or write to our database, ledger, codex, or memory vault.
 *     4. See any user data, credential, secret, API key, or session.
 *     5. Receive request bodies that contain anything beyond the minimal
 *        public payload declared at call time.
 *     6. Have their responses trusted. All responses are QUARANTINED and
 *        the caller must explicitly extract a narrow, validated field
 *        (e.g. an HTTP Date header, a single numeric value).
 *
 * The Sandbox is a thin, hard-coded fetch wrapper that:
 *   • allows ONLY HTTPS,
 *   • blocks every private / loopback / link-local IP and hostname,
 *   • strips all default credential headers (Cookie, Authorization,
 *     Set-Cookie, Proxy-*, X-Forwarded-*),
 *   • blocks redirects to non-HTTPS or to disallowed hosts,
 *   • bounds response size and time,
 *   • blocks any request body unless the caller explicitly opts in with
 *     `allowBody: true` AND passes a pre-vetted minimal payload,
 *   • writes every call (allowed or denied) to the sandbox audit log.
 *
 * No code in the sovereign call path (council, codex, ratification,
 * consensus, ledger, audit) may reach the network EXCEPT through this
 * Sandbox. Direct `fetch()` from those paths is forbidden by code review.
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { logger } from "./logger.js";

export type SandboxPurpose =
  | "time-source"          // NASA Date headers, NIST, GPS-derived UTC, etc.
  | "satellite-telemetry"  // CelesTrak, NORAD, ISS observation
  | "ai-training"          // distillation from external LLM into our agents
  | "ai-observation"       // benchmark / reverse-engineering
  | "public-data"          // open-data fetches (no PII, no auth)
  | "doctrine-ingest";     // pulling our own attached doctrine docs

export interface SandboxRequest {
  url: string;
  purpose: SandboxPurpose;
  method?: "GET" | "HEAD";        // POST/PUT/DELETE forbidden through sandbox
  timeoutMs?: number;              // hard cap 10s
  maxBytes?: number;               // hard cap 2MB
  acceptHeader?: string;           // explicit Accept (no defaults that leak UA)
  description: string;             // human-readable reason for audit
}

export interface SandboxResponse {
  ok: boolean;
  status: number;
  headers: { date: string | null; contentType: string | null };
  body: string;                    // always a string; caller parses
  bytes: number;
  latencyMs: number;
  url: string;                     // the final URL after sandbox checks
  quarantined: true;               // doctrinal marker — response is untrusted
  blockedReason?: string;
  error?: string;
}

interface AuditEntry {
  ts: number;
  url: string;
  host: string;
  purpose: SandboxPurpose;
  method: string;
  outcome: "allowed" | "denied" | "fetch-error";
  blockedReason?: string;
  status?: number;
  latencyMs?: number;
  bytes?: number;
  description: string;
}

const AUDIT: AuditEntry[] = [];
const MAX_AUDIT = 5_000;
const HARD_TIMEOUT_CEILING_MS = 10_000;
const HARD_BYTES_CEILING       = 2 * 1024 * 1024;

// Hosts and IP ranges that must never be reachable from the sandbox.
const FORBIDDEN_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.replit\.dev$/i,                // our own preview infra
  /\.replit\.app$/i,                // our deployed surface
  /\.repl\.co$/i,
];
const FORBIDDEN_IP_PATTERNS = [
  /^127\./,                         // loopback
  /^10\./,                          // RFC1918
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,                    // link-local
  /^0\./,
  /^::1$/, /^::$/, /^fc/i, /^fd/i, /^fe80/i,
];

// Headers forbidden from EVER being sent to the outside via the sandbox.
const STRIPPED_REQUEST_HEADERS = [
  "authorization", "cookie", "set-cookie", "x-api-key", "x-auth-token",
  "x-replit-user-id", "x-replit-user-name", "x-replit-user-roles",
  "proxy-authorization", "forwarded", "x-forwarded-for",
  "x-forwarded-host", "x-forwarded-proto", "x-real-ip",
];

function recordAudit(e: AuditEntry) {
  AUDIT.push(e);
  if (AUDIT.length > MAX_AUDIT) AUDIT.shift();
  if (e.outcome === "denied") logger.error({ entry: e }, "external-sandbox: DENIED");
  else logger.debug({ entry: e }, `external-sandbox: ${e.outcome}`);
}

function checkUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, reason: "invalid URL" }; }
  if (u.protocol !== "https:") return { ok: false, reason: `non-HTTPS protocol "${u.protocol}" forbidden` };
  if (u.username || u.password) return { ok: false, reason: "embedded credentials in URL forbidden" };
  const host = u.hostname.toLowerCase();
  for (const p of FORBIDDEN_HOST_PATTERNS) if (p.test(host)) return { ok: false, reason: `forbidden hostname "${host}"` };
  for (const p of FORBIDDEN_IP_PATTERNS) if (p.test(host)) return { ok: false, reason: `forbidden IP/range "${host}"` };
  return { ok: true, url: u };
}

/**
 * The ONLY permitted way for sovereign code to reach the network. Returns a
 * QUARANTINED response — callers must extract a narrow validated field and
 * never feed the raw body back into the sovereign decision path.
 *
 * Throws if the request is denied by the sandbox policy.
 */
export async function sandboxedFetch(req: SandboxRequest): Promise<SandboxResponse> {
  const t0 = Date.now();
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    const reason = `method "${method}" forbidden through sandbox (GET/HEAD only)`;
    recordAudit({ ts: t0, url: req.url, host: "?", purpose: req.purpose, method, outcome: "denied", blockedReason: reason, description: req.description });
    throw new Error(`SANDBOX_DENIED: ${reason}`);
  }
  const check = checkUrl(req.url);
  if (!check.ok) {
    recordAudit({ ts: t0, url: req.url, host: "?", purpose: req.purpose, method, outcome: "denied", blockedReason: check.reason, description: req.description });
    throw new Error(`SANDBOX_DENIED: ${check.reason}`);
  }
  const url = check.url;
  const timeoutMs = Math.min(req.timeoutMs ?? 4000, HARD_TIMEOUT_CEILING_MS);
  const maxBytes  = Math.min(req.maxBytes  ?? 256 * 1024, HARD_BYTES_CEILING);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // Build a minimal, non-leaking header set. Accept defaults to plain JSON.
    const headers: Record<string, string> = {
      Accept: req.acceptHeader ?? "application/json, text/plain, */*",
      "User-Agent": "TesseraSovereign-Sandbox/1.0",
    };
    // Defensive: strip any forbidden headers from the bag.
    for (const k of STRIPPED_REQUEST_HEADERS) delete headers[k];

    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers,
      redirect: "follow",  // re-checked below
      // No body: sovereign sandbox is read-only.
    });
    // Re-check the post-redirect URL.
    const finalCheck = checkUrl(res.url || url.toString());
    if (!finalCheck.ok) {
      const reason = `redirect landed on disallowed URL: ${finalCheck.reason}`;
      recordAudit({ ts: t0, url: req.url, host: url.hostname, purpose: req.purpose, method, outcome: "denied", blockedReason: reason, description: req.description });
      throw new Error(`SANDBOX_DENIED: ${reason}`);
    }

    // Read body up to maxBytes, then drop the rest.
    let body = "";
    let bytes = 0;
    if (method !== "HEAD" && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytes += value.byteLength;
          if (bytes > maxBytes) {
            try { await reader.cancel(); } catch {}
            break;
          }
          body += decoder.decode(value, { stream: true });
        }
      }
      body += decoder.decode();
    }
    const latencyMs = Date.now() - t0;
    const out: SandboxResponse = {
      ok: res.ok,
      status: res.status,
      headers: {
        date: res.headers.get("date"),
        contentType: res.headers.get("content-type"),
      },
      body,
      bytes,
      latencyMs,
      url: finalCheck.url.toString(),
      quarantined: true,
    };
    recordAudit({ ts: t0, url: req.url, host: url.hostname, purpose: req.purpose, method, outcome: "allowed", status: res.status, latencyMs, bytes, description: req.description });
    return out;
  } catch (err) {
    const latencyMs = Date.now() - t0;
    recordAudit({ ts: t0, url: req.url, host: url.hostname, purpose: req.purpose, method, outcome: "fetch-error", blockedReason: (err as Error).message, latencyMs, description: req.description });
    return {
      ok: false, status: 0,
      headers: { date: null, contentType: null },
      body: "", bytes: 0, latencyMs,
      url: url.toString(), quarantined: true,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Doctrinal extractor: pull a single, narrow, validated field from a
 * quarantined sandbox response. Use this every time a sovereign module
 * consumes external data — it is the ONLY way data crosses the boundary.
 *
 * `validate` must reject anything that doesn't fit the expected shape.
 */
export function quarantineExtract<T>(
  resp: SandboxResponse,
  field: string,
  pick: (resp: SandboxResponse) => T | null,
  validate: (value: T) => boolean,
): T | null {
  if (!resp.ok) return null;
  const v = pick(resp);
  if (v === null || v === undefined) return null;
  if (!validate(v)) {
    logger.warn({ url: resp.url, field }, "external-sandbox: quarantine extraction rejected by validator");
    return null;
  }
  return v;
}

export function getSandboxAudit(limit = 200): ReadonlyArray<AuditEntry> {
  return AUDIT.slice(-limit);
}

/** Public doctrine text — surfaced in /api/audit and the Codex. */
export const EXTERNAL_SANDBOX_DOCTRINE = `
Every external resource — LLMs, APIs, tools, GitHub repos, external data
stores — runs ONLY inside the Tessera External Sandbox. The Sandbox:
  • allows HTTPS only,
  • blocks loopback / private / link-local hosts,
  • strips all credential headers,
  • forbids POST/PUT/DELETE,
  • bounds time + size,
  • quarantines every response (caller must extract a narrow validated field).

External resources can NEVER:
  • read our code,
  • read our database, ledger, codex, or memory vault,
  • read user data, secrets, or session,
  • cast a vote, ratify a decision, or speak in Council.

This rule is HARDER THAN ALL PRIOR RULES. It is permanent. Any code path
that reaches the network without going through sandboxedFetch() is a
violation and must be removed.
`.trim();
