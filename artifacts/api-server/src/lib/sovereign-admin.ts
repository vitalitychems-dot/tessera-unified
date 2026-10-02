// requireAdminSession middleware — the ONE gate (Heavy Council, P5/P12).
//
// Reads sovereign_session cookie, validates HMAC + TTL, attaches session info
// to req. If SOVEREIGN_ADMIN_TOKEN is unset, returns 503 'sovereign-unconfigured'
// — never silently open. No credential material logged.

import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE, lookupSession, isAdminTokenConfigured } from "./sovereign-session";
import { logger } from "./logger";

export interface AdminRequest extends Request {
  adminSession?: { issuedAt: number; expiresAt: number };
}

function readCookie(req: Request, name: string): string | undefined {
  // express's cookie-parser populates req.cookies; if it's not mounted,
  // parse the Cookie header manually.
  const fromParser = (req as Request & { cookies?: Record<string, string> }).cookies?.[name];
  if (typeof fromParser === "string") return fromParser;
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function requireAdminSession(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!isAdminTokenConfigured()) {
    res.status(503).json({
      ok: false,
      error: "sovereign-unconfigured",
      message: "SOVEREIGN_ADMIN_TOKEN is not configured. Privileged surfaces are fail-closed.",
    });
    return;
  }
  const cookie = readCookie(req, SESSION_COOKIE);
  const lookup = lookupSession(cookie);
  if (!lookup.valid || !lookup.record) {
    logger.warn({ path: req.path, reason: lookup.reason }, "admin-session denied");
    res.status(401).json({ ok: false, error: "unauthenticated", reason: lookup.reason ?? "unknown" });
    return;
  }
  req.adminSession = { issuedAt: lookup.record.issuedAt, expiresAt: lookup.record.expiresAt };
  next();
}
