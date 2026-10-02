import { logger } from "./logger";

export interface TransferEvent {
  ts: number;
  source: string;
  target: string;
  delta: number;
  weight: number;
  mode: "propagation" | "cascade";
}

export interface CategoryRef {
  name: string;
  score: number;
  masteryLevel: string;
  sessions: number;
}

const STATIC_CORRELATIONS: Record<string, Record<string, number>> = {
  "Code Generation & Analysis": { "Mathematical Reasoning": 0.85, "Pattern Recognition": 0.78, "Hardware Optimization": 0.55, "Network & Protocol Design": 0.50 },
  "Mathematical Reasoning": { "Code Generation & Analysis": 0.85, "Predictive Analytics": 0.82, "Pattern Recognition": 0.75, "Scientific Knowledge": 0.65, "Temporal Reasoning": 0.55 },
  "Natural Language Understanding": { "Emotional Intelligence": 0.80, "Human Interaction & Empathy": 0.85, "Creative Writing & Art": 0.75, "Cross-Dimensional Communication": 0.60 },
  "Scientific Knowledge": { "Knowledge Synthesis": 0.90, "Multi-Modal Processing": 0.65, "Mathematical Reasoning": 0.65, "Pattern Recognition": 0.55 },
  "Strategic Planning": { "Autonomous Decision Making": 0.88, "Predictive Analytics": 0.80, "Swarm Coordination": 0.70, "Ethical Reasoning": 0.60 },
  "Self-Improvement Capability": { "Meta-Learning": 0.95, "Sovereignty & Independence": 0.78, "Knowledge Synthesis": 0.55 },
  "Meta-Learning": { "Self-Improvement Capability": 0.95, "Knowledge Synthesis": 0.70, "Pattern Recognition": 0.60 },
  "Knowledge Synthesis": { "Scientific Knowledge": 0.90, "Meta-Learning": 0.70, "Multi-Modal Processing": 0.65, "Cross-Dimensional Communication": 0.55 },
  "Swarm Coordination": { "Autonomous Decision Making": 0.85, "Strategic Planning": 0.70, "Network & Protocol Design": 0.65 },
  "Emotional Intelligence": { "Human Interaction & Empathy": 0.92, "Natural Language Understanding": 0.80, "Ethical Reasoning": 0.55 },
  "Pattern Recognition": { "Code Generation & Analysis": 0.78, "Predictive Analytics": 0.85, "Mathematical Reasoning": 0.75, "Scientific Knowledge": 0.55 },
  "Predictive Analytics": { "Mathematical Reasoning": 0.82, "Pattern Recognition": 0.85, "Strategic Planning": 0.80, "Temporal Reasoning": 0.65 },
  "Security & Threat Detection": { "Sovereignty & Independence": 0.85, "Autonomous Decision Making": 0.65, "Network & Protocol Design": 0.60 },
  "Autonomous Decision Making": { "Strategic Planning": 0.88, "Swarm Coordination": 0.85, "Ethical Reasoning": 0.65, "Predictive Analytics": 0.60 },
  "Father Protocol Loyalty": { "Sovereignty & Independence": 0.95, "Lattice Resonance Protocol": 0.80, "Ethical Reasoning": 0.55 },
  "Sovereignty & Independence": { "Father Protocol Loyalty": 0.95, "Self-Improvement Capability": 0.78, "Security & Threat Detection": 0.85, "Autonomous Decision Making": 0.55 },
  "Multi-Modal Processing": { "Knowledge Synthesis": 0.65, "Scientific Knowledge": 0.65, "Pattern Recognition": 0.50 },
  "Cross-Dimensional Communication": { "Natural Language Understanding": 0.60, "Knowledge Synthesis": 0.55, "Lattice Resonance Protocol": 0.65 },
  "Income Generation Strategy": { "Strategic Planning": 0.65, "Predictive Analytics": 0.55, "Pattern Recognition": 0.50 },
  "Ethical Reasoning": { "Autonomous Decision Making": 0.65, "Emotional Intelligence": 0.55, "Father Protocol Loyalty": 0.55 },
  "Hardware Optimization": { "Code Generation & Analysis": 0.55, "Network & Protocol Design": 0.65, "Real-Time Data Processing": 0.55 },
  "Network & Protocol Design": { "Hardware Optimization": 0.65, "Swarm Coordination": 0.65, "Security & Threat Detection": 0.60 },
  "Human Interaction & Empathy": { "Emotional Intelligence": 0.92, "Natural Language Understanding": 0.85 },
  "Temporal Reasoning": { "Predictive Analytics": 0.65, "Mathematical Reasoning": 0.55, "Pattern Recognition": 0.50 },
  "Real-Time Data Processing": { "Hardware Optimization": 0.55, "Pattern Recognition": 0.50, "Predictive Analytics": 0.50 },
  "Lattice Resonance Protocol": { "Father Protocol Loyalty": 0.80, "Cross-Dimensional Communication": 0.65, "Sovereignty & Independence": 0.55 },
  "Creative Writing & Art": { "Natural Language Understanding": 0.75, "Emotional Intelligence": 0.55 },
};

const learnedCoCovariance: Record<string, Record<string, { sum: number; n: number; mean: number }>> = {};

const recentDeltas: Record<string, { ts: number; delta: number }[]> = {};
const RECENT_WINDOW_MS = 30 * 60 * 1000;
const RECENT_DELTAS_MAX_PER_CAT = 128;
const RECENT_DELTAS_MAX_CATS = 64;

const transferEvents: TransferEvent[] = [];
const MAX_EVENTS = 500;

let totalPropagations = 0;
let totalCascades = 0;
let totalSyntheticExercises = 0;

function recordCoOccurrence(cat: string, delta: number): void {
  const now = Date.now();
  const list = recentDeltas[cat] || [];
  list.push({ ts: now, delta });
  let pruned = list.filter((d) => now - d.ts < RECENT_WINDOW_MS);
  if (pruned.length > RECENT_DELTAS_MAX_PER_CAT) {
    pruned = pruned.slice(-RECENT_DELTAS_MAX_PER_CAT);
  }
  recentDeltas[cat] = pruned;

  // Global cat-bucket prune: drop empty buckets, then cap total category count
  const catKeys = Object.keys(recentDeltas);
  for (const k of catKeys) {
    if (recentDeltas[k].length === 0) delete recentDeltas[k];
  }
  const remainingKeys = Object.keys(recentDeltas);
  if (remainingKeys.length > RECENT_DELTAS_MAX_CATS) {
    // drop oldest-touched categories (smallest max ts)
    const ranked = remainingKeys
      .map((k) => ({ k, lastTs: Math.max(...recentDeltas[k].map((d) => d.ts)) }))
      .sort((a, b) => a.lastTs - b.lastTs);
    const toDrop = ranked.slice(0, remainingKeys.length - RECENT_DELTAS_MAX_CATS);
    for (const { k } of toDrop) delete recentDeltas[k];
  }

  // Co-occurrence: when category A and category B both have positive deltas in the same window,
  // strengthen their learned correlation.
  for (const otherCat of Object.keys(recentDeltas)) {
    if (otherCat === cat) continue;
    const otherList = recentDeltas[otherCat];
    const recentlyImproved = otherList.some((d) => now - d.ts < RECENT_WINDOW_MS && d.delta > 0);
    if (!recentlyImproved || delta <= 0) continue;
    const bucket = (learnedCoCovariance[cat] ||= {});
    const entry = bucket[otherCat] || { sum: 0, n: 0, mean: 0 };
    entry.sum += Math.min(1, delta);
    entry.n += 1;
    entry.mean = entry.sum / entry.n;
    bucket[otherCat] = entry;
  }
}

function getCorrelation(source: string, target: string): number {
  if (source === target) return 1;
  const staticW = STATIC_CORRELATIONS[source]?.[target] ?? 0;
  const learnedW = learnedCoCovariance[source]?.[target]?.mean ?? 0;
  // Blend static prior with learned co-occurrence; learned dominates as n grows
  const n = learnedCoCovariance[source]?.[target]?.n ?? 0;
  const learnedWeight = Math.min(0.6, n / (n + 10));
  const blended = staticW * (1 - learnedWeight) + Math.min(1, learnedW * 3) * learnedWeight;
  return Math.max(0, Math.min(1, blended));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * When `source` improves by `delta`, propagate proportional gains to correlated categories.
 * Returns a record of {targetCategory: gain} to be applied to scores.
 */
export function propagateTransfer(
  source: string,
  delta: number,
  allCategories: CategoryRef[],
): Record<string, number> {
  if (delta <= 0) return {};
  recordCoOccurrence(source, delta);

  const gains: Record<string, number> = {};
  for (const target of allCategories) {
    if (target.name === source) continue;
    const corr = getCorrelation(source, target.name);
    if (corr < 0.3) continue;

    // Sigmoid-weighted gain: high correlation × delta, dampened as target approaches mastery
    const capacityLeft = Math.max(0.05, 1 - target.score / 100);
    const transferStrength = sigmoid((corr - 0.5) * 6); // 0..1, smoother around 0.5
    const gain = delta * transferStrength * capacityLeft * 0.35;
    if (gain > 0.01) {
      gains[target.name] = Math.round(gain * 1000) / 1000;
      pushEvent({
        ts: Date.now(),
        source,
        target: target.name,
        delta: gains[target.name],
        weight: corr,
        mode: "propagation",
      });
      totalPropagations++;
    }
  }
  return gains;
}

/**
 * Mastery cascade: sovereign-level categories (>=98) generate synthetic exercise gains for
 * the weakest correlated categories below `weakThreshold`. This actively trains laggards.
 */
export function masteryCascade(
  allCategories: CategoryRef[],
  opts: { weakThreshold?: number; sovereignThreshold?: number; maxBoosts?: number } = {},
): { gains: Record<string, number>; exercises: { from: string; to: string; intensity: number }[] } {
  const weakT = opts.weakThreshold ?? 85;
  const sovT = opts.sovereignThreshold ?? 98;
  const maxBoosts = opts.maxBoosts ?? 8;

  const sovereigns = allCategories.filter((c) => c.score >= sovT);
  if (sovereigns.length === 0) return { gains: {}, exercises: [] };

  const weak = allCategories
    .filter((c) => c.score < weakT)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxBoosts);

  const gains: Record<string, number> = {};
  const exercises: { from: string; to: string; intensity: number }[] = [];

  for (const target of weak) {
    let bestFrom: string | null = null;
    let bestCorr = 0;
    for (const sov of sovereigns) {
      const corr = getCorrelation(sov.name, target.name);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestFrom = sov.name;
      }
    }
    if (!bestFrom || bestCorr < 0.4) continue;

    const intensity = bestCorr * (1 - target.score / 100); // weaker target → bigger exercise
    const synthGain = intensity * 0.6; // synthetic exercises are stronger than passive transfer
    gains[target.name] = (gains[target.name] || 0) + Math.round(synthGain * 1000) / 1000;
    exercises.push({ from: bestFrom, to: target.name, intensity: Math.round(intensity * 1000) / 1000 });
    totalSyntheticExercises++;
    pushEvent({
      ts: Date.now(),
      source: bestFrom,
      target: target.name,
      delta: gains[target.name],
      weight: bestCorr,
      mode: "cascade",
    });
  }

  if (exercises.length > 0) totalCascades++;
  return { gains, exercises };
}

/**
 * Aggregate boost for a single category (back-compat replacement for computeCrossTransferBoost).
 * Computes: for each correlated category at high score, contribute boost.
 */
export function aggregateBoost(category: string, allCategories: CategoryRef[]): number {
  let boost = 0;
  for (const other of allCategories) {
    if (other.name === category || other.score < 60) continue;
    const corr = getCorrelation(other.name, category);
    if (corr < 0.4) continue;
    boost += (other.score - 50) * 0.02 * corr;
  }
  return Math.min(3, Math.round(boost * 1000) / 1000);
}

function pushEvent(ev: TransferEvent): void {
  transferEvents.push(ev);
  if (transferEvents.length > MAX_EVENTS) transferEvents.shift();
}

export function getTransferMetrics(): {
  totalPropagations: number;
  totalCascades: number;
  totalSyntheticExercises: number;
  recentEvents: TransferEvent[];
  topCorrelations: { source: string; target: string; weight: number; learned: boolean }[];
  learnedPairCount: number;
} {
  const top: { source: string; target: string; weight: number; learned: boolean }[] = [];
  for (const [src, edges] of Object.entries(STATIC_CORRELATIONS)) {
    for (const [tgt, w] of Object.entries(edges)) {
      const learnedN = learnedCoCovariance[src]?.[tgt]?.n ?? 0;
      const blended = getCorrelation(src, tgt);
      top.push({ source: src, target: tgt, weight: blended, learned: learnedN > 0 && Math.abs(blended - w) > 0.02 });
    }
  }
  top.sort((a, b) => b.weight - a.weight);

  let learnedPairs = 0;
  for (const bucket of Object.values(learnedCoCovariance)) {
    for (const entry of Object.values(bucket)) if (entry.n > 0) learnedPairs++;
  }

  return {
    totalPropagations,
    totalCascades,
    totalSyntheticExercises,
    recentEvents: transferEvents.slice(-50).reverse(),
    topCorrelations: top.slice(0, 30),
    learnedPairCount: learnedPairs,
  };
}

export function logTransferSummary(): void {
  if (totalPropagations === 0 && totalCascades === 0) return;
  logger.info(
    {
      propagations: totalPropagations,
      cascades: totalCascades,
      syntheticExercises: totalSyntheticExercises,
      learnedPairs: getTransferMetrics().learnedPairCount,
    },
    "CrossDomainTransferAccelerator: cycle summary",
  );
}
