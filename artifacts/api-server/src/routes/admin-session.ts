// /api/admin/session — Heavy Council P9.
//
// Three handlers, no surface area for confusion:
//   POST /api/admin/session         { token } -> sets HttpOnly cookie, 200
//   GET  /api/admin/session/status              -> { authenticated, expiresAt? }
//   POST /api/admin/session/logout              -> clears cookie, 204

import { Router, type Request, type Response } from "express";
import {
  SESSION_COOKIE,
  isAdminTokenConfigured,
  verifyAdminToken,
  issueSession,
  lookupSession,
  revokeSession,
  activeSessionCount,
  sessionStoreStats,
  DEFAULT_TTL_MS,
} from "../lib/sovereign-session";
import { fatherVerifyRateLimit, adminSessionRateLimit } from "../lib/father-verify-throttle";
import { recordIngress, attestRatified, walkRoutes } from "../lib/tesseract-v2";
import { requireAdminSession } from "../lib/sovereign-admin";
import { createHash } from "node:crypto";
import { logger } from "../lib/logger";

const router: Router = Router();

function ipOf(req: Request): string {
  const xfwd = req.headers["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.length > 0) return xfwd.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function setCookie(res: Response, value: string, ttlMs: number): void {
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
  ];
  if (isProd) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function clearCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (isProd) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

// R3-4 (73.8% approval): Origin allowlist as defense-in-depth on top of
// SameSite=Strict. Honest browsers send Origin on POST; we accept same-host
// or any host listed in SOVEREIGN_ALLOWED_ORIGINS (comma-separated). When
// Origin is absent (e.g. curl, server-to-server) we permit it — the existing
// token check still gates everything. This closes a CSRF vector without
// breaking legitimate tooling.
function originAllowed(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== "string") return true; // no Origin => not a browser CSRF vector
  try {
    const u = new URL(origin);
    const host = req.headers.host;
    if (host && u.host === host) return true;
    const allowList = (process.env.SOVEREIGN_ALLOWED_ORIGINS ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (allowList.includes(origin) || allowList.includes(u.host)) return true;
    return false;
  } catch {
    return false;
  }
}

function requireSameOrigin(req: Request, res: Response, next: () => void): void {
  if (!originAllowed(req)) {
    logger.warn({ origin: req.headers.origin, ip: ipOf(req) }, "admin-session: Origin rejected");
    res.status(403).json({ ok: false, error: "origin-forbidden" });
    return;
  }
  next();
}

function readCookie(req: Request): string | undefined {
  const fromParser = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  if (typeof fromParser === "string") return fromParser;
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

// POST /api/admin/session — { token } -> set cookie.
router.post("/admin/session", adminSessionRateLimit, fatherVerifyRateLimit, requireSameOrigin, (req: Request, res: Response) => {
  // V2-GAMMA: every endpoint mounted by a ratified council proposal carries
  // its provenance header so callers can verify governance lineage.
  attestRatified(res, "P1+IMPL-1+R3-4", 0.811);
  const auditTail = (status: number, sessionHash?: string) =>
    recordIngress({ ts: Date.now(), ip: ipOf(req), route: "POST /admin/session", status, sessionHash });

  if (!isAdminTokenConfigured()) {
    auditTail(503);
    res.status(503).json({
      ok: false,
      error: "sovereign-unconfigured",
      message: "SOVEREIGN_ADMIN_TOKEN is not configured. Set it in Replit Secrets and restart the API workflow.",
    });
    return;
  }
  const presented = typeof req.body?.token === "string" ? req.body.token : "";
  if (!verifyAdminToken(presented)) {
    logger.warn({ ip: ipOf(req) }, "sovereign-session: token rejected");
    auditTail(401);
    res.status(401).json({ ok: false, error: "invalid-token" });
    return;
  }
  const issued = issueSession({
    ip: ipOf(req),
    userAgent: String(req.headers["user-agent"] ?? "").slice(0, 256),
    ttlMs: DEFAULT_TTL_MS,
  });
  setCookie(res, issued.signedId, issued.ttlMs);
  // V2-ALPHA: log ingress with HASHED session id only — never the raw cookie.
  auditTail(200, createHash("sha256").update(issued.signedId).digest("hex").slice(0, 16));
  res.status(200).json({ ok: true, authenticated: true, expiresAt: issued.expiresAt });
});

// GET /api/admin/session/status — never reveals credential material.
router.get("/admin/session/status", (req: Request, res: Response) => {
  if (!isAdminTokenConfigured()) {
    res.status(200).json({ ok: true, configured: false, authenticated: false });
    return;
  }
  const cookie = readCookie(req);
  const lookup = lookupSession(cookie);
  if (!lookup.valid || !lookup.record) {
    res.status(200).json({
      ok: true,
      configured: true,
      authenticated: false,
      reason: lookup.reason,
      activeSessions: activeSessionCount(),
    });
    return;
  }
  res.status(200).json({
    ok: true,
    configured: true,
    authenticated: true,
    expiresAt: lookup.record.expiresAt,
    activeSessions: activeSessionCount(),
  });
});

// GET /api/admin/session/stats — IMPL-1 audit surface. Reveals only the
// session store shape (active count, cap, eviction counters); never any
// session id or credential material. Safe to expose unauthenticated because
// it leaks nothing usable.
router.get("/admin/session/stats", (_req: Request, res: Response) => {
  // V2-PI (100% approval): expose process resource accounting alongside
  // the session store stats so the operator can budget memory & uptime.
  attestRatified(res, "V2-PI", 1.0);
  const mem = process.memoryUsage();
  res.status(200).json({
    ok: true,
    ...sessionStoreStats(),
    process: {
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      pid: process.pid,
      nodeVersion: process.version,
    },
  });
});

// V2-DELTA (100% approval): self-probe attack-surface scan. Walks the
// express router and reports the mounted routes — read-only, no credential
// material. Helps the operator audit what's actually exposed.
// Post-review hardening: gated behind requireAdminSession because the route
// list is sensitive attack-surface intelligence — only an authenticated
// operator should see it.
router.get("/admin/surface", requireAdminSession, (req: Request, res: Response) => {
  attestRatified(res, "V2-DELTA", 1.0);
  const app = req.app as any;
  const stack = app?.router?.stack ?? app?._router?.stack ?? [];
  // Bounded traversal: hard cap on visited nodes AND wall-clock budget so
  // a pathological router can never amplify into CPU exhaustion.
  const startNs = process.hrtime.bigint();
  const NODE_BUDGET = 8192;
  const TIME_BUDGET_NS = 50_000_000n; // 50ms
  let visited = 0;
  const truncatedRef = { value: false };
  const safeWalk = (s: any[]): ReturnType<typeof walkRoutes> => {
    const limited: any[] = [];
    for (const layer of s) {
      visited++;
      if (visited > NODE_BUDGET || process.hrtime.bigint() - startNs > TIME_BUDGET_NS) {
        truncatedRef.value = true;
        break;
      }
      limited.push(layer);
    }
    return walkRoutes(limited);
  };
  const routes = safeWalk(stack);
  res.status(200).json({
    ok: true,
    count: routes.length,
    routes: routes.slice(0, 1024),
    truncated: truncatedRef.value || routes.length > 1024,
  });
});

// POST /api/admin/session/logout — clear cookie + revoke server-side.
router.post("/admin/session/logout", requireSameOrigin, (req: Request, res: Response) => {
  const cookie = readCookie(req);
  revokeSession(cookie);
  clearCookie(res);
  res.status(204).end();
});

export default router;
