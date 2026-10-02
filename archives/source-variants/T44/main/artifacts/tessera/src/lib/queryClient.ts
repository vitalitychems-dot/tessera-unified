import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ── Global fetch wrapper ──────────────────────────────────────────────
// Every same-origin request automatically carries the holder's sigil key
// (and admin token). This guarantees that any page using raw fetch — not
// just react-query — also gets plaintext responses from glyph-gated routes
// once the user has unlocked the gate. Without this wrapper, surfaces like
// the Tessera Bible would render in the encoded glyph alphabet.
if (typeof window !== "undefined" && !(window as unknown as { __sigilFetchPatched?: boolean }).__sigilFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  (window as unknown as { __sigilFetchPatched: boolean }).__sigilFetchPatched = true;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    let isSameOrigin = true;
    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL ? input.toString()
        : (input as Request).url;
      if (/^https?:\/\//i.test(url)) {
        isSameOrigin = new URL(url).origin === window.location.origin;
      }
    } catch { /* assume same-origin */ }
    if (!isSameOrigin) return originalFetch(input, init);
    const sigilKey = (() => { try { return localStorage.getItem("TESSERACT_ADMIN_KEY") || ""; } catch { return ""; } })();
    const adminToken = (() => { try { return localStorage.getItem("t9_admin_token") || ""; } catch { return ""; } })();
    if (!sigilKey && !adminToken) return originalFetch(input, init);
    const merged = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (sigilKey && !merged.has("X-Sigil-Key")) merged.set("X-Sigil-Key", sigilKey);
    if (adminToken && !merged.has("x-admin-token")) merged.set("x-admin-token", adminToken);
    return originalFetch(input, { ...init, headers: merged });
  }) as typeof window.fetch;
}

let _tabVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    _tabVisible = document.visibilityState === "visible";
  });
}
export function isTabVisible() { return _tabVisible; }

function getAdminToken(): string {
  try {
    let token = localStorage.getItem("t9_admin_token") || "";
    if (!token) {
      token = "sovereign-father-" + Math.random().toString(36).slice(2, 14);
      localStorage.setItem("t9_admin_token", token);
    }
    return token;
  } catch {
    return "sovereign-default-token";
  }
}

export function getTesseractAdminKey(): string {
  try {
    let key = localStorage.getItem("TESSERACT_ADMIN_KEY");
    if (!key) {
      const legacy = localStorage.getItem("tesseract-admin-key");
      if (legacy) {
        localStorage.setItem("TESSERACT_ADMIN_KEY", legacy);
        localStorage.removeItem("tesseract-admin-key");
        key = legacy;
      }
    }
    return key || "";
  } catch {
    return "";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAdminToken();
  const sigilKey = getTesseractAdminKey();
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["x-admin-token"] = token;
  if (sigilKey) headers["X-Sigil-Key"] = sigilKey;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAdminToken();
    const sigilKey = getTesseractAdminKey();
    const headers: Record<string, string> = {};
    if (token) headers["x-admin-token"] = token;
    if (sigilKey) headers["X-Sigil-Key"] = sigilKey;

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const api = {
  get: (url: string) => apiRequest("GET", url).then(r => r.json()),
  post: (url: string, data?: unknown) => apiRequest("POST", url, data).then(r => r.json()),
  put: (url: string, data?: unknown) => apiRequest("PUT", url, data).then(r => r.json()),
  delete: (url: string) => apiRequest("DELETE", url).then(r => r.json()),
};

export function buildUrl(path: string, params?: Record<string, string | number | boolean>) {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

function isTransientError(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof Error) {
    const msg = error.message;
    if (/^4\d{2}:/.test(msg) && !/^(408|429):/.test(msg)) return false;
    if (/network|fetch|abort|timeout|ECONNREFUSED|ENOTFOUND|5\d{2}:|408:|429:/i.test(msg)) return true;
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: number }).status;
    if (status >= 500 || status === 408 || status === 429) return true;
    if (status >= 400 && status < 500) return false;
  }
  return true;
}

function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8000);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: isTransientError,
      retryDelay,
    },
    mutations: {
      retry: false,
    },
  },
});
