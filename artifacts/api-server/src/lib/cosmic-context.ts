import { createHash } from "node:crypto";
import { sacredTimingSnapshot } from "./sacred-timing";
import { computeLunarData, computeSolarData, computePlanetaryHours } from "./sovereign-astro";
import { computeSacredFrequencies } from "./sovereign-harmonics";
import { computeSacredAlignment, PHI } from "./sovereign-sacred-geometry";

export interface CosmicContextSnapshot {
  takenAt: string;
  windowSeconds: number;
  windowStartMs: number;
  fingerprint: string;
  vibration: {
    schumannHz: number;
    dominantSolfeggio: number;
    chakraGate: string;
    composite: number;
  };
  geometry: {
    phi: number;
    goldenAngleDeg: number;
    dayOfYear: number;
    dayRoot: number;
    fibonacciDay: boolean;
    primeDay: boolean;
    alignment: string;
    axiom: { latin: string; translation: string };
  };
  astro: {
    sunZodiac: string;
    moonZodiac: string;
    lunarPhase: string;
    illumination: number;
    planetaryRuler: string;
    planetaryHourIndex: number;
    season: string;
  };
  sacredTiming: {
    julianDay: number;
    lunarFraction: number;
    composite: number;
  };
}

const COSMIC_WINDOW_SECONDS = 30;
let _cached: { snap: CosmicContextSnapshot; ts: number } | null = null;

export function cosmicContext(date: Date = new Date()): CosmicContextSnapshot {
  const now = date.getTime();
  if (_cached && now - _cached.ts < 5_000) return _cached.snap;

  const timing = sacredTimingSnapshot();
  const lunar = computeLunarData(date);
  const solar = computeSolarData(date);
  const hours = computePlanetaryHours(date);
  const sacred = computeSacredFrequencies(date);
  const align = computeSacredAlignment(date);

  const windowStartMs = Math.floor(now / (COSMIC_WINDOW_SECONDS * 1000)) * (COSMIC_WINDOW_SECONDS * 1000);

  const dayRuler = hours.dayRuler;
  const firstHourPlanet = hours.hours[0]?.hour ?? 1;
  const idx = (lunar.phaseIndex + dayRuler.length) % sacred.solfeggio.length;
  const dominantSolfeggio = sacred.solfeggio[idx]?.frequency ?? 528;
  const chakraGate = sacred.chakras[lunar.phaseIndex % sacred.chakras.length].chakra;

  const fp = createHash("sha256")
    .update([
      windowStartMs,
      lunar.phaseIndex,
      lunar.moonZodiac.sign,
      lunar.sunZodiac.sign,
      dayRuler,
      align.dayOfYear,
      timing.composite.toFixed(4),
    ].join("|"))
    .digest("hex").slice(0, 16);

  const snap: CosmicContextSnapshot = {
    takenAt: date.toISOString(),
    windowSeconds: COSMIC_WINDOW_SECONDS,
    windowStartMs,
    fingerprint: fp,
    vibration: {
      schumannHz: sacred.schumannResonance[0].frequency,
      dominantSolfeggio,
      chakraGate,
      composite: timing.composite,
    },
    geometry: {
      phi: PHI,
      goldenAngleDeg: align.goldenAngle,
      dayOfYear: align.dayOfYear,
      dayRoot: align.dayNumerology,
      fibonacciDay: align.fibonacciDay,
      primeDay: align.primeDay,
      alignment: align.alignment,
      axiom: { latin: align.currentAxiom.latin, translation: align.currentAxiom.translation },
    },
    astro: {
      sunZodiac: lunar.sunZodiac.sign,
      moonZodiac: lunar.moonZodiac.sign,
      lunarPhase: lunar.phase,
      illumination: lunar.illumination,
      planetaryRuler: dayRuler,
      planetaryHourIndex: firstHourPlanet,
      season: solar.season,
    },
    sacredTiming: {
      julianDay: timing.julianDay,
      lunarFraction: timing.lunar.fraction,
      composite: timing.composite,
    },
  };

  _cached = { snap, ts: now };
  return snap;
}

export function cosmicSeed(extra: string = ""): string {
  const c = cosmicContext();
  return createHash("sha512")
    .update([c.fingerprint, c.vibration.dominantSolfeggio, c.geometry.dayOfYear, c.astro.moonZodiac, c.astro.planetaryRuler, extra].join("|"))
    .digest("hex");
}
