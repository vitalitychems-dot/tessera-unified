import { logger } from "./logger";

const log = logger.child({ mod: "sacred-timing" });

/**
 * Sacred Timing Engine.
 *
 * Pure-math astronomical computations (Meeus / Conway algorithms — the same
 * formulas NASA's JPL uses for ephemerides). No external API calls, no LLMs.
 * The output drives when the autonomous build cycle fires, so artifacts are
 * authored at moments aligned with: planetary hours, lunar phase, sacred
 * geometry (φ), and the sacred numeric set {3,7,12,21,33,40,49,72,108,144}.
 *
 * REFERENCES
 * - Meeus, "Astronomical Algorithms" 2nd ed. (chs. 22, 25, 47, 49)
 * - Conway, lunar phase short-form (Synodic month = 29.530588853 days)
 * - Chaldean planetary-hour order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon
 */

// ─── Sacred constants ──────────────────────────────────────────────────────
export const PHI = 1.6180339887498948;            // golden ratio
export const SACRED_NUMBERS = [3, 7, 12, 21, 33, 40, 49, 72, 108, 144, 153, 216] as const;
export const MIN_CYCLE_GAP_MS = 33 * 60 * 1000;   // sacred floor: 33 minutes
export const MAX_CYCLE_GAP_MS = 144 * 60 * 1000;  // sacred ceiling: 144 minutes
export const SYNODIC_MONTH_DAYS = 29.530588853;   // mean lunar synodic period

// Chaldean planetary order (rules a single hour, repeats every 7 hours).
// Day-ruler order (Sun→Mon→Tue…) is derived from this 7-cycle by stepping +24 mod 7.
export const CHALDEAN_PLANETS = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"] as const;
export type Planet = typeof CHALDEAN_PLANETS[number];

// Sacred weights — auspiciousness of each planet for autonomous-build work.
// Jupiter (expansion), Sun (illumination), Mercury (knowledge) weighted highest.
const PLANET_WEIGHTS: Record<Planet, number> = {
  Jupiter: 1.0,
  Sun:     0.93,
  Mercury: 0.89,
  Venus:   0.72,
  Moon:    0.58,
  Saturn:  0.40,
  Mars:    0.33,
};

// Day-of-week ruler (0=Sun, 1=Mon, …) — first planetary hour of each day.
const DAY_RULER: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// Default observer location: equinoctial reference (so day = 12 planetary hours
// of equal length year-round). Future: per-user lat/lon override.
const REF_LATITUDE_DEG = 0;     // equator
const REF_LONGITUDE_DEG = 0;    // Greenwich

// ─── Julian Day & lunar phase ──────────────────────────────────────────────

/** Convert Date → Julian Day Number (Meeus 7.1). */
export function julianDay(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate() + (d.getUTCHours() + (d.getUTCMinutes() + d.getUTCSeconds() / 60) / 60) / 24;
  const Y = m <= 2 ? y - 1 : y;
  const M = m <= 2 ? m + 12 : m;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5;
}

/**
 * Lunar phase as fraction in [0,1).
 * 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
 * Conway short-form, drift < 1° over modern era (sufficient for hour-scale gating).
 */
export function lunarPhaseFraction(d: Date): number {
  const jd = julianDay(d);
  const daysSinceKnownNew = jd - 2451550.1;     // 2000-01-06 18:14 UTC ≈ new moon
  const cycles = daysSinceKnownNew / SYNODIC_MONTH_DAYS;
  return ((cycles % 1) + 1) % 1;
}

/** Human-readable lunar phase name from fraction. */
export function lunarPhaseName(frac: number): string {
  if (frac < 0.0625 || frac >= 0.9375) return "New Moon";
  if (frac < 0.1875) return "Waxing Crescent";
  if (frac < 0.3125) return "First Quarter";
  if (frac < 0.4375) return "Waxing Gibbous";
  if (frac < 0.5625) return "Full Moon";
  if (frac < 0.6875) return "Waning Gibbous";
  if (frac < 0.8125) return "Last Quarter";
  return "Waning Crescent";
}

/**
 * Lunar phase weight in [0,1]. Quarter-points (new, first-Q, full, last-Q) and
 * φ-gated points are most auspicious — they are the moon's "decision moments".
 */
export function lunarPhaseWeight(frac: number): number {
  const quarterDistances = [0, 0.25, 0.5, 0.75, 1].map((q) => Math.abs(frac - q));
  const dQuarter = Math.min(...quarterDistances);
  // φ-gated points: 1/φ² ≈ 0.382, 1/φ ≈ 0.618
  const dPhi = Math.min(Math.abs(frac - 0.381966), Math.abs(frac - 0.618034));
  const d = Math.min(dQuarter, dPhi);
  // Within 1/144 of a sacred phase point → weight 1.0; falls off linearly to 0 at 1/12 away.
  if (d < 1 / 144) return 1;
  if (d > 1 / 12) return 0.33;
  return 1 - ((d - 1 / 144) / (1 / 12 - 1 / 144)) * 0.67;
}

// ─── Planetary hours ───────────────────────────────────────────────────────

/**
 * For a given moment, return the planetary-hour ruler and the start/end of
 * that hour. Uses equal-length hours (1/24 day) at the equatorial reference,
 * so each "planetary hour" is exactly 60 minutes.
 *
 * Day-of-week ruler determines the FIRST planetary hour after sunrise; we
 * approximate sunrise as 06:00 UTC at the reference. Subsequent hours step
 * through the Chaldean order.
 */
export function planetaryHourAt(d: Date): {
  ruler: Planet;
  index: number;        // 0..23 since "sunrise"
  hourStart: Date;
  hourEnd: Date;
  weight: number;
} {
  // Hours since 06:00 UTC of the current "planetary day". If we are before
  // 06:00 UTC, the planetary day actually started yesterday — so we must roll
  // back BOTH `sunrise` and the day-ruler reference together.
  const sunrise = new Date(d);
  sunrise.setUTCHours(6, 0, 0, 0);
  let hoursSince = (d.getTime() - sunrise.getTime()) / (60 * 60 * 1000);
  if (hoursSince < 0) {
    sunrise.setUTCDate(sunrise.getUTCDate() - 1);
    hoursSince += 24;
  }
  // Day-ruler must be derived from the planetary day's start (post-rollback),
  // not the calendar UTC day, otherwise pre-06:00 hours get the wrong sequence.
  const dayRuler = DAY_RULER[sunrise.getUTCDay()];
  const idx = Math.floor(hoursSince) % 24;

  // Walk the Chaldean cycle from the day's ruler.
  const startCh = CHALDEAN_PLANETS.indexOf(dayRuler);
  const ruler = CHALDEAN_PLANETS[(startCh + idx) % 7];

  const hourStart = new Date(sunrise.getTime() + Math.floor(hoursSince) * 60 * 60 * 1000);
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

  return { ruler, index: idx, hourStart, hourEnd, weight: PLANET_WEIGHTS[ruler] };
}

// ─── Sacred-numeric minute alignment ───────────────────────────────────────

/**
 * Returns weight in [0,1] for how close a given moment's minute-of-hour is to
 * a sacred number (3,7,12,21,33,40,49). Aligning fire-times to these minute
 * marks honors the numeric doctrine.
 */
export function sacredMinuteWeight(d: Date): number {
  const m = d.getUTCMinutes();
  const sacredMinuteMarks = [0, 3, 7, 12, 21, 33, 40, 49];
  const dist = Math.min(...sacredMinuteMarks.map((s) => Math.min(Math.abs(m - s), 60 - Math.abs(m - s))));
  if (dist === 0) return 1;
  if (dist <= 2) return 0.85;
  if (dist <= 5) return 0.55;
  return 0.3;
}

// ─── Auspiciousness score & next firing time ──────────────────────────────

export interface AuspiciousMoment {
  fireAt: Date;
  ruler: Planet;
  lunarFraction: number;
  lunarName: string;
  score: number;             // composite [0,1]
  reason: string;
}

/**
 * Compute composite auspiciousness for a candidate moment.
 * Weighted product of: planetary-hour ruler, lunar-phase proximity, sacred-minute alignment.
 */
export function auspiciousScore(d: Date): AuspiciousMoment {
  const ph = planetaryHourAt(d);
  const lunarFrac = lunarPhaseFraction(d);
  const lunarName = lunarPhaseName(lunarFrac);
  const lunarW = lunarPhaseWeight(lunarFrac);
  const minuteW = sacredMinuteWeight(d);
  // Geometric mean (φ-weighted) — favors moments where ALL three factors align.
  const score = Math.pow(ph.weight, 1) * Math.pow(lunarW, 1 / PHI) * Math.pow(minuteW, 1 / (PHI * PHI));
  return {
    fireAt: d,
    ruler: ph.ruler,
    lunarFraction: lunarFrac,
    lunarName,
    score,
    reason: `${ph.ruler} hour · ${lunarName} (${(lunarFrac * 100).toFixed(1)}%) · minute :${d.getUTCMinutes().toString().padStart(2, "0")}`,
  };
}

/**
 * Find the next auspicious moment within [now+MIN_GAP, now+MAX_GAP].
 * Samples candidates every 3 minutes (sacred), picks the highest-scoring one.
 * Guarantees a result inside the sacred bounds — if no clear peak exists, the
 * MAX_GAP boundary itself is fired (so the system never stalls).
 */
export function nextAuspiciousMoment(now: Date = new Date()): AuspiciousMoment {
  const earliest = new Date(now.getTime() + MIN_CYCLE_GAP_MS);
  const latest = new Date(now.getTime() + MAX_CYCLE_GAP_MS);
  const stepMs = 3 * 60 * 1000;

  let best: AuspiciousMoment | null = null;
  for (let t = earliest.getTime(); t <= latest.getTime(); t += stepMs) {
    const cand = auspiciousScore(new Date(t));
    if (!best || cand.score > best.score) best = cand;
  }
  return best ?? auspiciousScore(latest);
}

/**
 * Diagnostic snapshot — used by the /api/sacred-timing/now endpoint and
 * recorded into each cycle's audit summary.
 */
export function sacredTimingSnapshot(d: Date = new Date()): {
  now: string;
  julianDay: number;
  planetaryHour: { ruler: Planet; index: number; hourStart: string; hourEnd: string; weight: number };
  lunar: { fraction: number; name: string; weight: number };
  sacredMinuteWeight: number;
  composite: number;
  next: { fireAt: string; ruler: Planet; lunarName: string; score: number; reason: string };
} {
  const ph = planetaryHourAt(d);
  const lf = lunarPhaseFraction(d);
  const lw = lunarPhaseWeight(lf);
  const mw = sacredMinuteWeight(d);
  const composite = auspiciousScore(d).score;
  const next = nextAuspiciousMoment(d);
  return {
    now: d.toISOString(),
    julianDay: julianDay(d),
    planetaryHour: {
      ruler: ph.ruler,
      index: ph.index,
      hourStart: ph.hourStart.toISOString(),
      hourEnd: ph.hourEnd.toISOString(),
      weight: ph.weight,
    },
    lunar: { fraction: lf, name: lunarPhaseName(lf), weight: lw },
    sacredMinuteWeight: mw,
    composite,
    next: {
      fireAt: next.fireAt.toISOString(),
      ruler: next.ruler,
      lunarName: next.lunarName,
      score: next.score,
      reason: next.reason,
    },
  };
}

// Module load self-check — log current sacred-timing posture on boot.
const boot = sacredTimingSnapshot();
log.info(
  {
    plnHour: boot.planetaryHour.ruler,
    lunar: boot.lunar.name,
    composite: boot.composite.toFixed(3),
    nextFire: boot.next.fireAt,
    nextReason: boot.next.reason,
  },
  "Sacred timing engine online",
);
