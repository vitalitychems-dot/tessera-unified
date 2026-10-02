const KEY = "vs-research-session";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

type StoredSession = { id: string; createdAt: number; lastSeenAt: number };

function newSession(now: number): StoredSession {
  return {
    id: `s_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    lastSeenAt: now,
  };
}

export function researchSessionId() {
  if (typeof window === "undefined") return "ssr";
  try {
    const now = Date.now();
    let session: StoredSession | null = null;
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredSession>;
        if (
          typeof parsed.id === "string" &&
          /^s_[a-z0-9_]{8,64}$/.test(parsed.id) &&
          Number.isFinite(parsed.createdAt) &&
          Number.isFinite(parsed.lastSeenAt)
        ) {
          session = parsed as StoredSession;
        }
      } catch {
        // Legacy browser IDs and malformed records are replaced below.
      }
    }
    if (
      !session ||
      now - session.lastSeenAt > IDLE_TIMEOUT_MS ||
      now - session.createdAt > MAX_SESSION_AGE_MS
    ) {
      session = newSession(now);
    } else {
      session.lastSeenAt = now;
    }
    localStorage.setItem(KEY, JSON.stringify(session));
    return session.id;
  } catch {
    return "anon";
  }
}
