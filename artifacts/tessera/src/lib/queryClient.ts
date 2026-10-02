import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Heavy Council, Apr 2026 — Proposals P2 + P5
//
// The legacy global window.fetch monkey-patch and the X-Sigil-Key /
// x-admin-token / TESSERACT_ADMIN_KEY localStorage credential injection have
// been REMOVED. Authentication is now exclusively the HttpOnly
// `sovereign_session` cookie issued by POST /api/admin/session. Browser code
// no longer touches credential material at all — XSS cannot exfiltrate the
// canonical admin token from JS, because it never lives in JS.
//
// Every fetch in this app must use credentials: "include" if it needs
// authenticated routes; the cookie is attached automatically. The functions
// in this file already do that.
// ─────────────────────────────────────────────────────────────────────────────

let _tabVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    _tabVisible = document.visibilityState === "visible";
  });
}
export function isTabVisible() { return _tabVisible; }

/**
 * Legacy reader retained ONLY so deprecated localStorage values can be wiped
 * during migration. New code MUST NOT rely on this. It returns "" by design.
 */
export function getTesseractAdminKey(): string {
  if (typeof window === "undefined") return "";
  try {
    // Migration cleanup — purge any leftover credential material from
    // localStorage so XSS can't read it on subsequent visits.
    localStorage.removeItem("TESSERACT_ADMIN_KEY");
    localStorage.removeItem("tesseract-admin-key");
    localStorage.removeItem("t9_admin_token");
    localStorage.removeItem("t9_sovereign_key");
  } catch { /* ignore */ }
  return "";
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
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";

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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
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

// Wipe legacy localStorage credentials on module load.
if (typeof window !== "undefined") {
  try { getTesseractAdminKey(); } catch { /* ignore */ }
}
