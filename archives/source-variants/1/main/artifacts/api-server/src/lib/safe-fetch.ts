import { logger } from "./logger";
import { logProviderCall } from "./provider-call-logger";

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

    const res = await fetch(url, {
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
