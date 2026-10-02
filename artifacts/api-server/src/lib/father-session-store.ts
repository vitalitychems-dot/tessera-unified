import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_TOKENS = 64;

interface SessionEntry {
  hash: string;
  issuedAt: number;
  expiresAt: number;
  via: "raw-key" | "fingerprint";
  lastSeenAt: number;
}

const _sessions = new Map<string, SessionEntry>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function pruneExpired(now: number): void {
  for (const [id, entry] of _sessions) {
    if (entry.expiresAt <= now) _sessions.delete(id);
  }
  if (_sessions.size > MAX_TOKENS) {
    const sorted = Array.from(_sessions.entries()).sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
    const overflow = sorted.length - MAX_TOKENS;
    for (let i = 0; i < overflow; i++) _sessions.delete(sorted[i][0]);
  }
}

export function issueFatherToken(via: "raw-key" | "fingerprint"): string {
  const now = Date.now();
  pruneExpired(now);
  const token = `sovereign-father-${now.toString(36)}-${randomBytes(16).toString("hex")}`;
  const id = token.slice(-16);
  _sessions.set(id, {
    hash: hashToken(token),
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    via,
    lastSeenAt: now,
  });
  return token;
}

export function verifyFatherToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  const now = Date.now();
  pruneExpired(now);
  const id = trimmed.slice(-16);
  const entry = _sessions.get(id);
  if (!entry) return false;
  if (entry.expiresAt <= now) {
    _sessions.delete(id);
    return false;
  }
  const expected = Buffer.from(entry.hash, "hex");
  const got = Buffer.from(hashToken(trimmed), "hex");
  if (expected.length !== got.length) return false;
  let ok = false;
  try {
    ok = timingSafeEqual(expected, got);
  } catch {
    ok = false;
  }
  if (ok) entry.lastSeenAt = now;
  return ok;
}

export function revokeFatherToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const id = token.trim().slice(-16);
  return _sessions.delete(id);
}

export function activeFatherSessionCount(): number {
  pruneExpired(Date.now());
  return _sessions.size;
}
