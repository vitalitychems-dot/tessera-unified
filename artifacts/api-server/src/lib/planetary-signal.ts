// Planetary-cycle signal key derivation.
//
// Sovereign rule (Apr 2026 redesign):
//   * TESSERACT_ADMIN_KEY  — the operator's permanent canonical key.
//   * SIGIL_ADMIN_KEY      — a rotating "signal" derived from the canonical
//                            key + the current planetary hour. Operators
//                            re-paste it whenever the gate notices it has
//                            slipped out of the live planetary window.
//
// The two secrets are intentionally DIFFERENT — knowing the signal does not
// reveal the canonical key (sha256 + LUS encoding), and knowing the canonical
// key only lets you re-derive the current/next signal yourself.

import { createHash } from "node:crypto";
import { planetaryHourAt } from "./sacred-timing";
import { lusEncode } from "./lingua-universalis";

const NAMESPACE = "tesseract:planetary-signal:v1";

export interface PlanetaryEpoch {
  epoch: string;          // canonical id of this planetary window
  ruler: string;          // planetary-hour ruler (Saturn / Jupiter / ...)
  index: number;          // hour-since-sunrise index 0..23
  hourStart: string;      // ISO start of the window
  hourEnd: string;        // ISO end of the window
}

/**
 * Build the canonical id of the planetary window containing `d`.
 * Format: `<ruler>#<idx>@<UTC-YYYY-MM-DD>` — stable across the full hour.
 */
function epochOf(d: Date): PlanetaryEpoch {
  const ph = planetaryHourAt(d);
  const dayKey = ph.hourStart.toISOString().slice(0, 10);
  return {
    epoch: `${ph.ruler}#${ph.index}@${dayKey}`,
    ruler: ph.ruler,
    index: ph.index,
    hourStart: ph.hourStart.toISOString(),
    hourEnd: ph.hourEnd.toISOString(),
  };
}

export function currentPlanetaryEpoch(d: Date = new Date()): PlanetaryEpoch {
  return epochOf(d);
}

/**
 * Derive the rotating signal-key glyphs for a given (canonicalKey, epoch).
 * Pure function — same inputs always yield the same output, regardless of
 * server restart. The output is a stable LUS glyph string (33 chars).
 */
export function derivePlanetarySignal(canonicalKey: string, epoch: string): string {
  const seed = createHash("sha256")
    .update(`${NAMESPACE}|${canonicalKey}|${epoch}`)
    .digest("hex");
  return lusEncode(seed);
}

/**
 * Returns the SIGNAL valid right now plus a small grace window so a save
 * lag of a few minutes around the hour boundary doesn't lock the operator
 * out. We accept: previous hour, current hour, next hour.
 */
export interface SignalWindow {
  current: { epoch: PlanetaryEpoch; signal: string };
  previous: { epoch: PlanetaryEpoch; signal: string };
  next: { epoch: PlanetaryEpoch; signal: string };
}

export function signalWindow(canonicalKey: string, d: Date = new Date()): SignalWindow {
  const cur = epochOf(d);
  const prev = epochOf(new Date(d.getTime() - 60 * 60 * 1000));
  const nxt = epochOf(new Date(d.getTime() + 60 * 60 * 1000));
  return {
    current: { epoch: cur, signal: derivePlanetarySignal(canonicalKey, cur.epoch) },
    previous: { epoch: prev, signal: derivePlanetarySignal(canonicalKey, prev.epoch) },
    next: { epoch: nxt, signal: derivePlanetarySignal(canonicalKey, nxt.epoch) },
  };
}

/**
 * Returns true iff `presented` matches any signal valid in the grace window
 * derived from `canonicalKey` at the current moment.
 */
export function isValidSignal(canonicalKey: string, presented: string): boolean {
  if (!presented || typeof presented !== "string") return false;
  const cand = presented.trim();
  if (!cand) return false;
  const w = signalWindow(canonicalKey);
  return cand === w.current.signal || cand === w.previous.signal || cand === w.next.signal;
}
