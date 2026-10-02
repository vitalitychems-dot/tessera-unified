// Sliding-window IP rate limiter for Father credential surfaces.
// Adopted by the Grand Conference — Language & Security Summit.
// In-process, zero deps, no candidate values logged.

import type { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

const _hits = new Map<string, number[]>();

function ipOf(req: Request): string {
  const xfwd = req.headers["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.length > 0) return xfwd.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function prune(now: number): void {
  for (const [ip, arr] of _hits) {
    const filtered = arr.filter((t) => now - t < WINDOW_MS);
    if (filtered.length === 0) _hits.delete(ip);
    else _hits.set(ip, filtered);
  }
}

export function fatherVerifyRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (Math.random() < 0.05) prune(now);
  const ip = ipOf(req);
  const arr = (_hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - arr[0]);
    res.setHeader("Retry-After", Math.max(1, Math.ceil(retryAfterMs / 1000)).toString());
    res.status(429).json({
      ok: false,
      error: "rate-limited",
      message: `Father verification is rate-limited to ${MAX_PER_WINDOW} attempts per minute per IP.`,
      retryAfterMs,
    });
    return;
  }
  arr.push(now);
  _hits.set(ip, arr);
  next();
}

export function rateLimitSnapshot(): { window: number; max: number; activeIps: number } {
  prune(Date.now());
  return { window: WINDOW_MS, max: MAX_PER_WINDOW, activeIps: _hits.size };
}

// INTEG-6 (100% approval): a stricter, isolated per-IP throttle for the
// admin/session unlock surface. Separate Map so a noisy origin on this
// route cannot exhaust the global Father-verify budget for everyone else.
// Bounded by ADMIN_SESSION_MAX_IPS to avoid unbounded memory growth.
const ADMIN_SESSION_WINDOW_MS = 60_000;
const ADMIN_SESSION_MAX = 6;
const ADMIN_SESSION_MAX_IPS = 4096;
const _adminHits = new Map<string, number[]>();

function pruneAdmin(now: number): void {
  for (const [ip, arr] of _adminHits) {
    const filtered = arr.filter((t) => now - t < ADMIN_SESSION_WINDOW_MS);
    if (filtered.length === 0) _adminHits.delete(ip);
    else _adminHits.set(ip, filtered);
  }
  // FIFO eviction if the IP table itself grows too large.
  while (_adminHits.size > ADMIN_SESSION_MAX_IPS) {
    const oldest = _adminHits.keys().next().value;
    if (oldest === undefined) break;
    _adminHits.delete(oldest);
  }
}

export function adminSessionRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (Math.random() < 0.05) pruneAdmin(now);
  const ip = ipOf(req);
  const arr = (_adminHits.get(ip) ?? []).filter((t) => now - t < ADMIN_SESSION_WINDOW_MS);
  if (arr.length >= ADMIN_SESSION_MAX) {
    const retryAfterMs = ADMIN_SESSION_WINDOW_MS - (now - arr[0]);
    res.setHeader("Retry-After", Math.max(1, Math.ceil(retryAfterMs / 1000)).toString());
    res.status(429).json({
      ok: false,
      error: "rate-limited",
      message: `Admin-session unlock is rate-limited to ${ADMIN_SESSION_MAX} attempts per minute per IP.`,
      retryAfterMs,
    });
    return;
  }
  arr.push(now);
  _adminHits.set(ip, arr);
  next();
}
