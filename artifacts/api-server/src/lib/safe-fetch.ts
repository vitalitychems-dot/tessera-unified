import { logger } from "./logger";
import { logProviderCall } from "./provider-call-logger";
import { runWithShepherdContext } from "./sovereign-fetch-guard";

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  providerId?: string;
  providerName?: string;
  skipTracking?: boolean;
}

export interface SafeFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  latencyMs: number;
  url: string;
}

const DEFAULT_TIMEOUT_MS = 15000;
const ALLOWED_READ_ONLY_HOSTS = new Set([
  "export.arxiv.org",
  "en.wikipedia.org",
  "api.nasa.gov",
  "images-api.nasa.gov",
  "images-assets.nasa.gov",
  "images-orig.nasa.gov",
]);
const MAX_SAME_HOST_REDIRECTS = 3;

function validateReadOnlyTarget(rawUrl: string): URL {
  const target = new URL(rawUrl);
  if (target.protocol !== "https:" || !ALLOWED_READ_ONLY_HOSTS.has(target.hostname) || target.username || target.password) {
    throw new Error("safeFetch allows only HTTPS GET requests to the fixed approved knowledge and NASA hosts.");
  }
  return target;
}

async function fetchApprovedKnowledgeSource(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (
    method !== "GET" ||
    init.body != null ||
    headers.has("authorization") ||
    headers.has("cookie") ||
    headers.has("proxy-authorization") ||
    init.credentials === "include"
  ) {
    throw new Error("Approved knowledge-source requests must be credential-free GET requests.");
  }

  let currentUrl = validateReadOnlyTarget(url);
  for (let redirects = 0; ; redirects++) {
    const response = await runWithShepherdContext(
      "shepherd-ingest",
      () => fetch(currentUrl.toString(), {
        ...init,
        method: "GET",
        body: undefined,
        credentials: "omit",
        redirect: "manual",
      }),
      "fixed-host read-only knowledge ingestion",
    );

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    if (redirects >= MAX_SAME_HOST_REDIRECTS) {
      throw new Error("Too many redirects from approved knowledge source.");
    }

    const redirectUrl = new URL(location, currentUrl);
    if (redirectUrl.hostname !== currentUrl.hostname) {
      throw new Error("Knowledge-source redirects must remain on the same approved host.");
    }
    currentUrl = validateReadOnlyTarget(redirectUrl.toString());
  }
}

export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    providerId = "external-http",
    providerName = "External HTTP",
    skipTracking = false,
    ...fetchOptions
  } = options;

  const start = Date.now();
  let latencyMs = 0;
  let status = 0;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const existingSignal = fetchOptions.signal as AbortSignal | undefined;
    if (existingSignal) {
      existingSignal.addEventListener("abort", () => controller.abort());
    }

    const res = await fetchApprovedKnowledgeSource(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timer);
    latencyMs = Date.now() - start;
    status = res.status;

    const contentType = res.headers.get("content-type") ?? "";
    let data: T;

    if (contentType.includes("application/json")) {
      data = (await res.json()) as T;
    } else {
      data = (await res.text()) as unknown as T;
    }

    if (!skipTracking) {
      await logProviderCall({
        providerId,
        providerName,
        model: "http",
        requestMessages: [{ role: "user", content: `GET ${url}` }],
        responseText: typeof data === "string" ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500),
        latencyMs,
        isExternal: true,
        error: res.ok ? undefined : `HTTP ${status}`,
      }).catch(() => {});
    }

    logger.debug({ url, status, latencyMs, providerId }, "safeFetch completed");

    return { ok: res.ok, status, data, latencyMs, url };
  } catch (err) {
    latencyMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);

    if (!skipTracking) {
      await logProviderCall({
        providerId,
        providerName,
        model: "http",
        requestMessages: [{ role: "user", content: `GET ${url}` }],
        latencyMs,
        isExternal: true,
        error: errMsg,
      }).catch(() => {});
    }

    logger.warn({ url, err: errMsg, latencyMs, providerId }, "safeFetch error");

    throw err;
  }
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  const result = await safeFetch<T>(url, { ...options, headers });
  if (!result.ok) {
    throw new Error(`HTTP ${result.status} fetching ${url}`);
  }
  return result.data;
}

export async function safeFetchText(
  url: string,
  options: SafeFetchOptions = {},
): Promise<string> {
  const result = await safeFetch<string>(url, options);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status} fetching ${url}`);
  }
  return result.data;
}
