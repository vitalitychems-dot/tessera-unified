/**
 * System Tunables — live, bounded parameters that real subsystems read from.
 *
 * The Invention Synthesis Engine adjusts these based on the weighted signal
 * from all built inventions, so approved/built inventions actually change
 * runtime behaviour instead of just sitting in the DB.
 *
 * Every tunable has a hard [min, max] clamp and an audit trail of changes.
 */

import { logger } from "./logger.js";

export interface TunableSpec {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  unit: string;
  description: string;
  /** Which invention categories can influence this tunable. */
  influencedBy: string[];
  /** Direction: "up" means high-impact inventions should INCREASE the value. */
  direction: "up" | "down";
}

export const TUNABLE_SPECS: Record<string, TunableSpec> = {
  autoLoopIntervalMs: {
    key: "autoLoopIntervalMs",
    label: "Invention auto-loop tick interval",
    default: 90_000,
    min: 30_000,
    max: 300_000,
    unit: "ms",
    description: "How often the invention auto-loop runs an advancement tick.",
    influencedBy: ["technology", "ai", "consensus"],
    direction: "down", // higher-impact → faster ticks → lower interval
  },
  buildsPerTick: {
    key: "buildsPerTick",
    label: "Max inventions advanced per build tick",
    default: 5,
    min: 2,
    max: 12,
    unit: "items",
    description: "Maximum inventions whose build progress is advanced per auto-loop tick.",
    influencedBy: ["technology", "hardware", "ai"],
    direction: "up",
  },
  consensusMinVotes: {
    key: "consensusMinVotes",
    label: "Consensus min votes for decision",
    default: 30,
    min: 12,
    max: 60,
    unit: "votes",
    description: "Minimum total votes a proposal needs before approval/rejection can be declared.",
    influencedBy: ["consensus", "sovereignty"],
    direction: "down", // better consensus tech → faster decisions → fewer votes needed
  },
  knowledgeRotationSlotMs: {
    key: "knowledgeRotationSlotMs",
    label: "Knowledge-scraper rotation slot",
    default: 600_000,
    min: 60_000,
    max: 1_800_000,
    unit: "ms",
    description: "Time window each scraper topic is active before rotating.",
    influencedBy: ["ai", "compression", "consciousness"],
    direction: "down",
  },
  autoHealerIntervalMs: {
    key: "autoHealerIntervalMs",
    label: "Auto-healer sweep interval",
    default: 45_000,
    min: 15_000,
    max: 180_000,
    unit: "ms",
    description: "How often the auto-healer scans for incidents.",
    influencedBy: ["sovereignty", "defense", "technology"],
    direction: "down",
  },
  cacheMaxEntries: {
    key: "cacheMaxEntries",
    label: "In-memory cache capacity",
    default: 2_000,
    min: 500,
    max: 20_000,
    unit: "entries",
    description: "Cap for in-process caches (embeddings, query responses).",
    influencedBy: ["compression", "ai", "technology"],
    direction: "up",
  },
  frequencyPulseHz: {
    key: "frequencyPulseHz",
    label: "Sovereign pulse frequency",
    default: 963,
    min: 432,
    max: 1111,
    unit: "Hz",
    description: "Crown-chakra sovereign frequency pulse — affects engine synchronisation rate.",
    influencedBy: ["frequency", "consciousness", "energy"],
    direction: "up",
  },
};

interface TunableState {
  value: number;
  lastChangedAt: number;
  lastChangeReason: string;
  changeHistory: Array<{ at: number; from: number; to: number; reason: string }>;
}

const state = new Map<string, TunableState>();
for (const spec of Object.values(TUNABLE_SPECS)) {
  state.set(spec.key, {
    value: spec.default,
    lastChangedAt: 0,
    lastChangeReason: "initial default",
    changeHistory: [],
  });
}

export function getTunable(key: string): number {
  const s = state.get(key);
  if (!s) throw new Error(`Unknown tunable: ${key}`);
  return s.value;
}

export function getAllTunables(): Array<{
  key: string;
  label: string;
  value: number;
  default: number;
  min: number;
  max: number;
  unit: string;
  description: string;
  percentOfRange: number;
  lastChangedAt: number;
  lastChangeReason: string;
}> {
  return Object.values(TUNABLE_SPECS).map((spec) => {
    const s = state.get(spec.key)!;
    const range = spec.max - spec.min;
    return {
      key: spec.key,
      label: spec.label,
      value: s.value,
      default: spec.default,
      min: spec.min,
      max: spec.max,
      unit: spec.unit,
      description: spec.description,
      percentOfRange: range > 0 ? Math.round(((s.value - spec.min) / range) * 1000) / 10 : 0,
      lastChangedAt: s.lastChangedAt,
      lastChangeReason: s.lastChangeReason,
    };
  });
}

export function setTunable(key: string, newValue: number, reason: string): {
  key: string;
  from: number;
  to: number;
  clamped: boolean;
} {
  const spec = TUNABLE_SPECS[key];
  const s = state.get(key);
  if (!spec || !s) throw new Error(`Unknown tunable: ${key}`);
  const clamped = Math.max(spec.min, Math.min(spec.max, Math.round(newValue)));
  const from = s.value;
  if (clamped === from) return { key, from, to: clamped, clamped: clamped !== newValue };
  s.value = clamped;
  s.lastChangedAt = Date.now();
  s.lastChangeReason = reason;
  s.changeHistory.push({ at: s.lastChangedAt, from, to: clamped, reason });
  if (s.changeHistory.length > 50) s.changeHistory.splice(0, s.changeHistory.length - 50);
  logger.info({ key, from, to: clamped, reason }, "SystemTunables: value changed");
  return { key, from, to: clamped, clamped: clamped !== newValue };
}

export function getTunableHistory(key: string): TunableState["changeHistory"] {
  return state.get(key)?.changeHistory ?? [];
}
