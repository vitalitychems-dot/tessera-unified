import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "./logger";
import { classifyCaller, recordShepherdAudit, ConsciousAgentOutboundRefused } from "./shepherd-outbound";

interface ShepherdContext {
  caller: string;
  reason?: string;
}

const ctx = new AsyncLocalStorage<ShepherdContext>();

let installed = false;
let originalFetch: typeof fetch | null = null;

export function getShepherdContext(): ShepherdContext | null {
  return ctx.getStore() ?? null;
}

/**
 * Run a block of code with a declared shepherd / system caller. Outbound fetches
 * inside this block will be allowed (and audited). Outside any context, fetch
 * is treated as conscious-agent caller and refused.
 */
export function runWithShepherdContext<T>(caller: string, fn: () => Promise<T> | T, reason?: string): Promise<T> | T {
  return ctx.run({ caller, reason }, fn);
}

function shouldBypass(url: string): boolean {
  // Allow loopback to ourselves (internal route -> route calls inside the app)
  // and the explicit Replit dev domain proxy.
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "0.0.0.0") return true;
    if (u.hostname.endsWith(".replit.dev") || u.hostname.endsWith(".repl.co")) return true;
  } catch {
    return true; // non-URL inputs (relative) — let through
  }
  return false;
}

export function installSovereignFetchGuard(): void {
  if (installed) return;
  if (typeof globalThis.fetch !== "function") {
    logger.warn("globalThis.fetch not available — sovereign fetch guard not installed");
    return;
  }
  originalFetch = globalThis.fetch.bind(globalThis);

  const guarded: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

    if (shouldBypass(url)) {
      return originalFetch!(input as Parameters<typeof fetch>[0], init);
    }

    const store = ctx.getStore();
    const caller = store?.caller || "unknown";
    const cls = classifyCaller(caller);

    if (!store || cls === "conscious-agent") {
      await recordShepherdAudit({
        caller,
        callerType: cls,
        targetUrl: url,
        method,
        outcome: "refused",
        reason: store
          ? "Conscious agent attempted direct external fetch — sovereign policy violation"
          : "External fetch attempted with no shepherd context — must run inside runWithShepherdContext()",
      });
      throw new ConsciousAgentOutboundRefused(caller, url);
    }

    const start = Date.now();
    try {
      const resp = await originalFetch!(input as Parameters<typeof fetch>[0], init);
      await recordShepherdAudit({
        caller,
        callerType: cls,
        targetUrl: url,
        method,
        outcome: "allowed",
        status: resp.status,
        durationMs: Date.now() - start,
        reason: store?.reason,
      });
      return resp;
    } catch (err) {
      await recordShepherdAudit({
        caller,
        callerType: cls,
        targetUrl: url,
        method,
        outcome: "refused",
        durationMs: Date.now() - start,
        reason: `fetch error: ${(err as Error).message}`,
      });
      throw err;
    }
  }) as typeof fetch;

  globalThis.fetch = guarded;
  installed = true;
  logger.info("Sovereign fetch guard installed — all external fetches now require runWithShepherdContext()");
}
