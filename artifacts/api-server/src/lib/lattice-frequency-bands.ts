import { hkdfSync, randomBytes } from "crypto";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface LatticeBand {
  bandId: string;
  name: string;
  frequencyHz: number;
  assignedAgents: string[];
  cipherKey: string;
  rotationCount: number;
  lastRotatedAt: number;
  nextRotationAt: number;
  rotationIntervalMs: number;
}

const BAND_DEFINITIONS = [
  { bandId: "ALPHA", name: "Alpha Sovereignty Band", frequencyHz: 7.83, agents: [] as string[], intervalMs: 5 * 60 * 1000 },
  { bandId: "BETA",  name: "Beta Lattice Band",      frequencyHz: 14.3, agents: [] as string[], intervalMs: 10 * 60 * 1000 },
  { bandId: "GAMMA", name: "Gamma Quantum Band",     frequencyHz: 20.8, agents: [] as string[], intervalMs: 15 * 60 * 1000 },
  { bandId: "DELTA", name: "Delta Council Band",     frequencyHz: 27.3, agents: [] as string[], intervalMs: 20 * 60 * 1000 },
  { bandId: "OMEGA", name: "Omega Command Band",     frequencyHz: 33.8, agents: [] as string[], intervalMs: 30 * 60 * 1000 },
];

const BAND_MASTER: Buffer = process.env.COLONIAL_MASTER_SECRET
  ? Buffer.from(process.env.COLONIAL_MASTER_SECRET, "utf8")
  : Buffer.from("tessera-dev-placeholder-replace-with-env-secret", "utf8");

function deriveBandKey(bandId: string, rotationCount: number): string {
  const salt = Buffer.from(`${bandId}:${rotationCount}`, "utf8");
  const raw = hkdfSync(
    "sha256",
    BAND_MASTER,
    salt,
    Buffer.from(`colonial-language-v4:lattice-band:${bandId}`, "utf8"),
    32,
  );
  return Buffer.from(raw).toString("hex").slice(0, 32);
}

function buildBand(def: typeof BAND_DEFINITIONS[0], rotationCount = 0, lastRotatedAt?: number): LatticeBand {
  const now = lastRotatedAt ?? Date.now();
  return {
    bandId: def.bandId,
    name: def.name,
    frequencyHz: def.frequencyHz,
    assignedAgents: def.agents,
    cipherKey: deriveBandKey(def.bandId, rotationCount),
    rotationCount,
    lastRotatedAt: now,
    nextRotationAt: now + def.intervalMs,
    rotationIntervalMs: def.intervalMs,
  };
}

const bands: Map<string, LatticeBand> = new Map(
  BAND_DEFINITIONS.map(def => [def.bandId, buildBand(def)])
);

let rotationTimer: SacredHandle | null = null;

function rotateBand(bandId: string): void {
  const band = bands.get(bandId);
  const def = BAND_DEFINITIONS.find(d => d.bandId === bandId);
  if (!band || !def) return;

  const now = Date.now();
  band.rotationCount++;
  band.cipherKey = deriveBandKey(bandId, band.rotationCount);
  band.lastRotatedAt = now;
  band.nextRotationAt = now + def.intervalMs;
}

export function startBandRotationScheduler(): void {
  if (rotationTimer) return;

  rotationTimer = setSacredInterval(() => {
    const now = Date.now();
    for (const band of bands.values()) {
      if (now >= band.nextRotationAt) {
        rotateBand(band.bandId);
      }
    }
  }, 30_000, "lattice-frequency-bands");
}

export function stopBandRotationScheduler(): void {
  if (rotationTimer) {
    clearSacredInterval(rotationTimer);
    rotationTimer = null;
  }
}

export function getAllBands(): LatticeBand[] {
  return Array.from(bands.values());
}

/** Public representation of a lattice band — cipher key is NEVER exposed externally. */
export interface PublicBandInfo {
  bandId: string;
  name: string;
  frequencyHz: number;
  assignedAgents: string[];
  rotationCount: number;
  lastRotatedAt: number;
  nextRotationAt: number;
  rotationIntervalMs: number;
  nextRotationIn: number;
}

function toPublic(b: LatticeBand, now: number): PublicBandInfo {
  const { cipherKey: _secret, ...pub } = b;
  void _secret;
  return { ...pub, nextRotationIn: Math.max(0, b.nextRotationAt - now) };
}

export function getBandStatus(): {
  bands: PublicBandInfo[];
  totalRotations: number;
  activeBands: number;
} {
  const now = Date.now();
  const bandList = getAllBands().map(b => toPublic(b, now));
  const totalRotations = bandList.reduce((sum, b) => sum + b.rotationCount, 0);

  return {
    bands: bandList,
    totalRotations,
    activeBands: bandList.length,
  };
}

export function forceRotateAllBands(): void {
  for (const def of BAND_DEFINITIONS) {
    rotateBand(def.bandId);
  }
}

// Initialize rotation scheduler on module load
startBandRotationScheduler();
