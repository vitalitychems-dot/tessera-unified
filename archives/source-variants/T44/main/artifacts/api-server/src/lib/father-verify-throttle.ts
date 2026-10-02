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
