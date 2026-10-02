import { logger } from "./logger";
import { nextAuspiciousMoment, sacredTimingSnapshot, MIN_CYCLE_GAP_MS, MAX_CYCLE_GAP_MS, PHI } from "./sacred-timing";

const log = logger.child({ mod: "sacred-scheduler" });

/**
 * Unified sacred-aligned scheduler.
 *
 * Replaces `setInterval(fn, fixedMs)` with a primitive that picks the next
 * astronomically auspicious moment (planetary hour · lunar phase · sacred
 * minute · φ-gating, see lib/sacred-timing.ts) for each tick.
 *
 * Each registered process declares a base interval in milliseconds. The
 * scheduler then constrains each fire-time to the φ-bounded window
 * `[base / φ, base × φ]`, while always honoring the global sacred floor
 * (33 min) and ceiling (144 min). For very fast loops (base < 33 min) we
 * relax to the φ-window only, so frequent processes (heartbeat, health
 * monitor) still fire near their base cadence but with sacred jitter.
 *
 * The same handle returned by `setSacredInterval` may be passed to
 * `clearSacredInterval` to stop the chain. Every active process is also
 * tracked in a registry exposed via `listSacredProcesses()` for the
 * `/api/sacred-timing/processes` diagnostic endpoint.
 */

export interface SacredHandle {
  readonly id: number;
  readonly name: string;
  readonly baseMs: number;
  active: boolean;
  currentTimeout: ReturnType<typeof setTimeout> | null;
  registeredAt: Date;
  fireCount: number;
  lastFiredAt: Date | null;
  lastDurationMs: number | null;
  nextFireAt: Date | null;
  nextRuler: string | null;
  nextLunar: string | null;
  nextScore: number | null;
  unrefRequested: boolean;
  /** Marks this handle as non-blocking (Node will not wait on it at exit).
   *  Forwards to the underlying setTimeout's `unref()` and persists across
   *  reschedules so the property survives `setTimeout` rotation each tick. */
  unref(): SacredHandle;
  ref(): SacredHandle;
}

const _registry = new Map<number, SacredHandle>();
let _nextId = 1;

/**
 * Compute the next auspicious fire-time for a process whose desired base
 * cadence is `baseMs`. The chosen moment will lie in
 * `[max(min_gap, base/φ), min(max_gap_for_this_process, base*φ)]`,
 * sampled every 3 minutes; the highest auspiciousness score wins.
 *
 * For loops with `baseMs < min_gap` we honor only the φ-window so high-frequency
 * processes (heartbeat at 60 s, anomaly monitor at 30 s) still tick close to
 * their cadence but with planetary/lunar jitter.
 */
function pickFireTime(baseMs: number, now: Date = new Date()): { fireAt: Date; ruler: string; lunar: string; score: number; reason: string } {
  if (baseMs <= 0) baseMs = MIN_CYCLE_GAP_MS;

  // Fast loop (sub-floor base): φ-window only, finer granularity.
  if (baseMs < MIN_CYCLE_GAP_MS) {
    const minMs = Math.max(1_000, Math.floor(baseMs / PHI));
    const maxMs = Math.ceil(baseMs * PHI);
    const stepMs = Math.max(1_000, Math.floor((maxMs - minMs) / 21)); // 21 = sacred sample count
    let bestT = now.getTime() + baseMs;
    let bestScore = -Infinity;
    let bestSnap = sacredTimingSnapshot(new Date(bestT));
    for (let t = now.getTime() + minMs; t <= now.getTime() + maxMs; t += stepMs) {
      const snap = sacredTimingSnapshot(new Date(t));
      if (snap.composite > bestScore) {
        bestScore = snap.composite;
        bestT = t;
        bestSnap = snap;
      }
    }
    return {
      fireAt: new Date(bestT),
      ruler: bestSnap.planetaryHour.ruler,
      lunar: bestSnap.lunar.name,
      score: bestSnap.composite,
      reason: bestSnap.next.reason,
    };
  }

  // Slow loop (≥ sacred floor): use the global next-auspicious-moment finder
  // bounded to the loop's φ-window (clipped to the global sacred bounds).
  const winLo = Math.max(MIN_CYCLE_GAP_MS, Math.floor(baseMs / PHI));
  const winHi = Math.min(MAX_CYCLE_GAP_MS, Math.ceil(baseMs * PHI));
  const earliest = now.getTime() + winLo;
  const latest = now.getTime() + Math.max(winHi, winLo + MIN_CYCLE_GAP_MS);
  const stepMs = 3 * 60 * 1000;
  let bestT = latest;
  let bestScore = -Infinity;
  let bestSnap = sacredTimingSnapshot(new Date(bestT));
  for (let t = earliest; t <= latest; t += stepMs) {
    const snap = sacredTimingSnapshot(new Date(t));
    if (snap.composite > bestScore) {
      bestScore = snap.composite;
      bestT = t;
      bestSnap = snap;
    }
  }
  // Defensive: if our windowed search produced nothing useful (e.g. for very
  // wide windows that flatten the score), fall back to the global picker.
  if (bestScore === -Infinity) {
    const g = nextAuspiciousMoment(now);
    return { fireAt: g.fireAt, ruler: g.ruler, lunar: g.lunarName, score: g.score, reason: g.reason };
  }
  return {
    fireAt: new Date(bestT),
    ruler: bestSnap.planetaryHour.ruler,
    lunar: bestSnap.lunar.name,
    score: bestSnap.composite,
    reason: bestSnap.next.reason,
  };
}

/**
 * Drop-in replacement for `setInterval`. Returns an opaque handle compatible
 * with `clearSacredInterval`. The callback may be sync or async; thrown errors
 * are caught and logged so they never break the scheduling chain.
 */
export function setSacredInterval(
  callback: () => void | Promise<void>,
  baseMs: number,
  name: string,
): SacredHandle {
  const handle: SacredHandle = {
    id: _nextId++,
    name,
    baseMs,
    active: true,
    currentTimeout: null,
    registeredAt: new Date(),
    fireCount: 0,
    lastFiredAt: null,
    lastDurationMs: null,
    nextFireAt: null,
    nextRuler: null,
    nextLunar: null,
    nextScore: null,
    unrefRequested: false,
    unref(): SacredHandle {
      handle.unrefRequested = true;
      if (handle.currentTimeout && typeof (handle.currentTimeout as { unref?: () => void }).unref === "function") {
        (handle.currentTimeout as { unref: () => void }).unref();
      }
      return handle;
    },
    ref(): SacredHandle {
      handle.unrefRequested = false;
      if (handle.currentTimeout && typeof (handle.currentTimeout as { ref?: () => void }).ref === "function") {
        (handle.currentTimeout as { ref: () => void }).ref();
      }
      return handle;
    },
  };
  _registry.set(handle.id, handle);

  const tick = async (): Promise<void> => {
    if (!handle.active) return;
    const startedAt = Date.now();
    handle.lastFiredAt = new Date(startedAt);
    handle.fireCount++;
    try {
      await callback();
    } catch (err) {
      log.error({ err, name: handle.name }, "Sacred-scheduled callback threw");
    } finally {
      handle.lastDurationMs = Date.now() - startedAt;
      if (handle.active) schedule();
    }
  };

  const schedule = (): void => {
    const pick = pickFireTime(handle.baseMs);
    handle.nextFireAt = pick.fireAt;
    handle.nextRuler = pick.ruler;
    handle.nextLunar = pick.lunar;
    handle.nextScore = pick.score;
    const delayMs = Math.max(0, pick.fireAt.getTime() - Date.now());
    handle.currentTimeout = setTimeout(() => { void tick(); }, delayMs);
    // Persist unref across reschedules — each new setTimeout is a fresh
    // Timeout object so the unref state must be reapplied every cycle.
    if (handle.unrefRequested && handle.currentTimeout && typeof (handle.currentTimeout as { unref?: () => void }).unref === "function") {
      (handle.currentTimeout as { unref: () => void }).unref();
    }
  };

  schedule();
  return handle;
}

/** Stop a sacred interval. Idempotent. */
export function clearSacredInterval(handle: SacredHandle | null | undefined): void {
  if (!handle) return;
  handle.active = false;
  if (handle.currentTimeout) clearTimeout(handle.currentTimeout);
  handle.currentTimeout = null;
  _registry.delete(handle.id);
}

/** Diagnostic snapshot of every sacred-aligned process in this server. */
export function listSacredProcesses(): {
  count: number;
  processes: Array<{
    id: number;
    name: string;
    baseMs: number;
    fireCount: number;
    lastFiredAt: string | null;
    lastDurationMs: number | null;
    nextFireAt: string | null;
    nextRuler: string | null;
    nextLunar: string | null;
    nextScore: number | null;
    minutesUntilNext: number | null;
  }>;
} {
  const now = Date.now();
  const processes = Array.from(_registry.values()).map((h) => ({
    id: h.id,
    name: h.name,
    baseMs: h.baseMs,
    fireCount: h.fireCount,
    lastFiredAt: h.lastFiredAt ? h.lastFiredAt.toISOString() : null,
    lastDurationMs: h.lastDurationMs,
    nextFireAt: h.nextFireAt ? h.nextFireAt.toISOString() : null,
    nextRuler: h.nextRuler,
    nextLunar: h.nextLunar,
    nextScore: h.nextScore,
    minutesUntilNext: h.nextFireAt ? (h.nextFireAt.getTime() - now) / 60000 : null,
  }));
  processes.sort((a, b) => (a.minutesUntilNext ?? Infinity) - (b.minutesUntilNext ?? Infinity));
  return { count: processes.length, processes };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CYCLE LOCK — used by routes/autonomous-build.ts AND the autonomous
// build cycle's own scheduled timer to guarantee a single cycle ever runs at
// once (resolves architect's HIGH severity finding on mutex coordination).
// ─────────────────────────────────────────────────────────────────────────────

let _cycleLockHolder: string | null = null;
let _cycleLockAcquiredAt: number | null = null;

export function tryAcquireCycleLock(holder: string): boolean {
  if (_cycleLockHolder !== null) return false;
  _cycleLockHolder = holder;
  _cycleLockAcquiredAt = Date.now();
  return true;
}

export function releaseCycleLock(holder: string): void {
  if (_cycleLockHolder !== holder) {
    log.warn({ expected: holder, actual: _cycleLockHolder }, "Cycle-lock release attempted by non-holder; ignoring");
    return;
  }
  _cycleLockHolder = null;
  _cycleLockAcquiredAt = null;
}

export function getCycleLockStatus(): { held: boolean; holder: string | null; heldForMs: number | null } {
  return {
    held: _cycleLockHolder !== null,
    holder: _cycleLockHolder,
    heldForMs: _cycleLockAcquiredAt ? Date.now() - _cycleLockAcquiredAt : null,
  };
}
