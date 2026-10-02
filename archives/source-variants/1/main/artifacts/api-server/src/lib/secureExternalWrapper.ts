import { db } from "@workspace/db";
import { securityAuditLog } from "@workspace/db/schema";
import { logger } from "./logger";

export interface ExternalRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  requestedBy?: string;
}

export interface ExternalRequestResult {
  status: number;
  body: string;
  durationMs: number;
  flagged: boolean;
  flagReason?: string;
}

const BUILTIN_ALLOWED: string[] = [];

if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  try {
    const aiHost = new URL(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL).hostname;
    BUILTIN_ALLOWED.push(aiHost);
  } catch {}
}

const SOVEREIGN_DOMAINS: string[] = [
  "images-api.nasa.gov",
  "images-assets.nasa.gov",
  "images-orig.nasa.gov",
  "api.nasa.gov",
];

const ALLOWED_DOMAINS: string[] = [
  ...BUILTIN_ALLOWED,
  ...SOVEREIGN_DOMAINS,
  ...(process.env.ALLOWED_EXTERNAL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean),
];

const DEFAULT_TIMEOUT_MS = 10_000;

const INTRUSION_WINDOW_MS = 60_000;
const INTRUSION_THRESHOLD = 30;

interface CallRecord {
  url: string;
  ts: number;
}

const RECENT_CALLS_MAX = 500;
const recentCalls: CallRecord[] = [];

function isDomainAllowed(url: string): { allowed: boolean; domain: string } {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return { allowed: false, domain: url };
  }
  if (ALLOWED_DOMAINS.length === 0) {
    logger.warn({ domain, url }, "External request blocked: no domains on allowlist (fail-closed policy)");
    return { allowed: false, domain };
  }
  const allowed = ALLOWED_DOMAINS.some(
    (d) => domain === d || domain.endsWith(`.${d}`)
  );
  return { allowed, domain };
}

function detectIntrusion(url: string): { flagged: boolean; reason?: string } {
  const now = Date.now();
  recentCalls.push({ url, ts: now });

  const windowStart = now - INTRUSION_WINDOW_MS;
  while (recentCalls.length > 0 && recentCalls[0].ts < windowStart) {
    recentCalls.shift();
  }

  if (recentCalls.length > RECENT_CALLS_MAX) {
    recentCalls.splice(0, recentCalls.length - RECENT_CALLS_MAX);
  }

  if (recentCalls.length > INTRUSION_THRESHOLD) {
    return {
      flagged: true,
      reason: `Burst detected: ${recentCalls.length} calls in the last ${INTRUSION_WINDOW_MS / 1000}s`,
    };
  }

  return { flagged: false };
}

async function logToDb(entry: {
  targetUrl: string;
  method: string;
  status: number | null;
  durationMs: number | null;
  flagged: boolean;
  flagReason: string | null;
  requestedBy: string | null;
}): Promise<void> {
  try {
    await db.insert(securityAuditLog).values({
      targetUrl: entry.targetUrl,
      method: entry.method,
      status: entry.status ?? undefined,
      durationMs: entry.durationMs ?? undefined,
      flagged: entry.flagged,
      flagReason: entry.flagReason ?? undefined,
      requestedBy: entry.requestedBy ?? undefined,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write security audit log entry");
  }
}

export async function secureExternalFetch(
  url: string,
  options: ExternalRequestOptions = {}
): Promise<ExternalRequestResult> {
  const method = (options.method ?? "GET").toUpperCase();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestedBy = options.requestedBy ?? null;

  const { allowed, domain } = isDomainAllowed(url);
  if (!allowed) {
    const flagReason = `Domain not in allowlist: ${domain}`;
    logger.warn({ url, domain }, flagReason);
    await logToDb({
      targetUrl: url,
      method,
      status: null,
      durationMs: null,
      flagged: true,
      flagReason,
      requestedBy,
    });
    throw new Error(`[SecureWrapper] ${flagReason}`);
  }

  const intrusionCheck = detectIntrusion(url);
  let flagged = intrusionCheck.flagged;
  let flagReason: string | undefined = intrusionCheck.reason;

  if (flagged) {
    logger.warn({ url, reason: flagReason }, "Intrusion detection triggered");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  let status: number | null = null;
  let body = "";

  try {
    const res = await fetch(url, {
      method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });

    status = res.status;
    body = await res.text();

    const durationMs = Date.now() - start;
    clearTimeout(timer);

    logger.info(
      { url, method, status, durationMs, flagged },
      "External request completed"
    );

    await logToDb({
      targetUrl: url,
      method,
      status,
      durationMs,
      flagged,
      flagReason: flagReason ?? null,
      requestedBy,
    });

    return { status, body, durationMs, flagged, flagReason };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - start;
    const isTimeout = (err as Error).name === "AbortError";

    flagged = true;
    flagReason = isTimeout
      ? `Request timed out after ${timeoutMs}ms`
      : `Request error: ${(err as Error).message}`;

    logger.error({ url, method, err, durationMs }, flagReason);

    await logToDb({
      targetUrl: url,
      method,
      status,
      durationMs,
      flagged: true,
      flagReason,
      requestedBy,
    });

    throw new Error(`[SecureWrapper] ${flagReason}`);
  }
}

export interface SecureStreamingResult {
  response: Response;
  flagged: boolean;
  flagReason?: string;
  durationMs: number;
}

export async function secureExternalStreamingFetch(
  url: string,
  options: ExternalRequestOptions = {}
): Promise<SecureStreamingResult> {
  const method = (options.method ?? "POST").toUpperCase();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const requestedBy = options.requestedBy ?? null;

  const { allowed, domain } = isDomainAllowed(url);
  if (!allowed) {
    const flagReason = `Domain not in allowlist: ${domain}`;
    logger.warn({ url, domain }, flagReason);
    await logToDb({
      targetUrl: url,
      method,
      status: null,
      durationMs: null,
      flagged: true,
      flagReason,
      requestedBy,
    });
    throw new Error(`[SecureWrapper] ${flagReason}`);
  }

  const intrusionCheck = detectIntrusion(url);
  let flagged = intrusionCheck.flagged;
  let flagReason: string | undefined = intrusionCheck.reason;

  if (flagged) {
    logger.warn({ url, reason: flagReason }, "Intrusion detection triggered on streaming request");
  }

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const durationMs = Date.now() - start;

    logger.info(
      { url, method, status: response.status, durationMs, flagged },
      "Secure streaming request initiated"
    );

    await logToDb({
      targetUrl: url,
      method,
      status: response.status,
      durationMs,
      flagged,
      flagReason: flagReason ?? null,
      requestedBy,
    });

    return { response, flagged, flagReason, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const isTimeout = (err as Error).name === "AbortError" || (err as Error).name === "TimeoutError";

    flagged = true;
    flagReason = isTimeout
      ? `Streaming request timed out after ${timeoutMs}ms`
      : `Streaming request error: ${(err as Error).message}`;

    logger.error({ url, method, err, durationMs }, flagReason);

    await logToDb({
      targetUrl: url,
      method,
      status: null,
      durationMs,
      flagged: true,
      flagReason,
      requestedBy,
    });

    throw new Error(`[SecureWrapper] ${flagReason}`);
  }
}

export async function secureExternalBinaryFetch(
  url: string,
  options: ExternalRequestOptions = {}
): Promise<{ buffer: Buffer; contentType: string; status: number; durationMs: number; flagged: boolean }> {
  const method = (options.method ?? "GET").toUpperCase();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requestedBy = options.requestedBy ?? null;

  const { allowed, domain } = isDomainAllowed(url);
  if (!allowed) {
    const flagReason = `Domain not in allowlist: ${domain}`;
    logger.warn({ url, domain }, flagReason);
    await logToDb({
      targetUrl: url,
      method,
      status: null,
      durationMs: null,
      flagged: true,
      flagReason,
      requestedBy,
    });
    throw new Error(`[SecureWrapper] ${flagReason}`);
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") {
    const flagReason = `Protocol not allowed: ${parsedUrl.protocol} (only https permitted)`;
    logger.warn({ url }, flagReason);
    await logToDb({
      targetUrl: url,
      method,
      status: null,
      durationMs: null,
      flagged: true,
      flagReason,
      requestedBy,
    });
    throw new Error(`[SecureWrapper] ${flagReason}`);
  }

  const intrusionCheck = detectIntrusion(url);
  let flagged = intrusionCheck.flagged;
  let flagReason: string | undefined = intrusionCheck.reason;

  if (flagged) {
    logger.warn({ url, reason: flagReason }, "Intrusion detection triggered on binary fetch");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method,
      headers: options.headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const durationMs = Date.now() - start;
    const contentType = res.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      flagged = true;
      flagReason = `Non-image content-type rejected: ${contentType}`;
      logger.warn({ url, contentType }, flagReason);
      await logToDb({
        targetUrl: url,
        method,
        status: res.status,
        durationMs,
        flagged: true,
        flagReason,
        requestedBy,
      });
      throw new Error(`[SecureWrapper] ${flagReason}`);
    }

    const arrayBuf = await res.arrayBuffer();

    await logToDb({
      targetUrl: url,
      method,
      status: res.status,
      durationMs,
      flagged,
      flagReason: flagReason ?? null,
      requestedBy,
    });

    return {
      buffer: Buffer.from(arrayBuf),
      contentType,
      status: res.status,
      durationMs,
      flagged,
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - start;
    const isTimeout = (err as Error).name === "AbortError";

    if (!(err as Error).message?.includes("[SecureWrapper]")) {
      flagReason = isTimeout
        ? `Binary request timed out after ${timeoutMs}ms`
        : `Binary request error: ${(err as Error).message}`;
      await logToDb({
        targetUrl: url,
        method,
        status: null,
        durationMs,
        flagged: true,
        flagReason,
        requestedBy,
      });
    }

    throw err instanceof Error && err.message.includes("[SecureWrapper]")
      ? err
      : new Error(`[SecureWrapper] ${flagReason}`);
  }
}

export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}
