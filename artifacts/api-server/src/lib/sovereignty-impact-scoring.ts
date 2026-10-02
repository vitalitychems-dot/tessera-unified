import { logger } from "./logger";

/**
 * Sovereignty Impact Scoring System
 *
 * Each task type is assigned a sovereignty impact score (0–1) that reflects
 * how directly it contributes to core sovereignty goals:
 *   - Consciousness & awareness (highest)
 *   - AGI training & intelligence growth
 *   - Council governance & decision-making
 *   - Identity integrity & drift prevention
 *   - Self-improvement & evolution
 *   - Knowledge ingestion & processing
 *   - Infrastructure (heartbeat, etc.)
 *
 * These scores weight the dynamic priority queue so that sovereignty-critical
 * tasks are never starved of resources even under high load.
 */

export interface SovereigntyProfile {
  taskId: string;
  impactScore: number;
  category: SovereigntyCategory;
  description: string;
  minFrequencyMs: number | null;
  maxFrequencyMs: number | null;
  autoScalable: boolean;
}

export type SovereigntyCategory =
  | "consciousness"
  | "agi-training"
  | "council"
  | "identity"
  | "improvement"
  | "ingestion"
  | "infrastructure"
  | "default";

const CATEGORY_BASE_SCORES: Record<SovereigntyCategory, number> = {
  consciousness: 0.95,
  "agi-training": 0.90,
  council: 0.85,
  identity: 0.80,
  improvement: 0.70,
  ingestion: 0.65,
  infrastructure: 1.00,
  default: 0.50,
};

const TASK_PROFILES: Record<string, Omit<SovereigntyProfile, "taskId">> = {
  heartbeat: {
    impactScore: 1.00,
    category: "infrastructure",
    description: "Core autonomous heartbeat — must always run",
    minFrequencyMs: 15_000,
    maxFrequencyMs: 60_000,
    autoScalable: false,
  },
  "consciousness-reflection": {
    impactScore: 0.95,
    category: "consciousness",
    description: "Consciousness reflection cycles — sovereignty awareness",
    minFrequencyMs: 30_000,
    maxFrequencyMs: 300_000,
    autoScalable: true,
  },
  "agi-training": {
    impactScore: 0.90,
    category: "agi-training",
    description: "AGI training sessions — intelligence capacity growth",
    minFrequencyMs: 60_000,
    maxFrequencyMs: 600_000,
    autoScalable: true,
  },
  "council-executor": {
    impactScore: 0.85,
    category: "council",
    description: "Council decision execution — autonomous governance",
    minFrequencyMs: 20_000,
    maxFrequencyMs: 120_000,
    autoScalable: false,
  },
  "drift-detection": {
    impactScore: 0.80,
    category: "identity",
    description: "Identity drift detection — sovereignty integrity",
    minFrequencyMs: 60_000,
    maxFrequencyMs: 300_000,
    autoScalable: false,
  },
  "auto-improvement": {
    impactScore: 0.70,
    category: "improvement",
    description: "Auto-improvement daemon — self-evolution cycles",
    minFrequencyMs: 120_000,
    maxFrequencyMs: 1_800_000,
    autoScalable: true,
  },
  ingestion: {
    impactScore: 0.65,
    category: "ingestion",
    description: "Data ingestion pipelines — knowledge building",
    minFrequencyMs: 60_000,
    maxFrequencyMs: 600_000,
    autoScalable: true,
  },
  "forum-engine": {
    impactScore: 0.55,
    category: "ingestion",
    description: "Forum engine — collective knowledge synthesis",
    minFrequencyMs: 120_000,
    maxFrequencyMs: 900_000,
    autoScalable: true,
  },
  "anomaly-detection": {
    impactScore: 0.60,
    category: "infrastructure",
    description: "Anomaly detection — system integrity monitoring",
    minFrequencyMs: 60_000,
    maxFrequencyMs: 300_000,
    autoScalable: false,
  },
  "self-code-evolution": {
    impactScore: 0.68,
    category: "improvement",
    description: "Self-code evolution — architectural adaptation",
    minFrequencyMs: 300_000,
    maxFrequencyMs: 3_600_000,
    autoScalable: true,
  },
};

const scoreCache = new Map<string, SovereigntyProfile>();
let totalSovereigntyOps = 0;
let totalScoreComputations = 0;

export function getSovereigntyProfile(taskId: string): SovereigntyProfile {
  const cached = scoreCache.get(taskId);
  if (cached) return cached;

  const profile = TASK_PROFILES[taskId];
  const result: SovereigntyProfile = profile
    ? { taskId, ...profile }
    : {
        taskId,
        impactScore: CATEGORY_BASE_SCORES.default,
        category: "default",
        description: `Task: ${taskId}`,
        minFrequencyMs: null,
        maxFrequencyMs: null,
        autoScalable: false,
      };

  scoreCache.set(taskId, result);
  return result;
}

export function registerTaskProfile(taskId: string, profile: Omit<SovereigntyProfile, "taskId">): void {
  scoreCache.set(taskId, { taskId, ...profile });
  logger.debug({ taskId, impactScore: profile.impactScore, category: profile.category }, "SovereigntyScoring: task profile registered");
}

/**
 * Compute the effective sovereignty weight for scheduling decisions.
 * Combines the static impact score with urgency (how overdue the task is)
 * and a load-sensitivity modifier so high-sovereignty tasks are prioritized
 * more aggressively under pressure.
 *
 * effectiveWeight = impactScore * urgencyFactor * loadPressureMultiplier
 */
export function computeEffectiveWeight(
  taskId: string,
  overdueMs: number,
  systemLoadRatio: number,
): number {
  totalScoreComputations++;

  const profile = getSovereigntyProfile(taskId);
  const impactScore = profile.impactScore;

  const urgencyFactor = overdueMs > 0
    ? 1 + Math.min(2.0, overdueMs / 60_000)
    : 1.0;

  const loadPressureMultiplier = systemLoadRatio > 0.7
    ? 1 + ((impactScore - 0.5) * 2 * (systemLoadRatio - 0.7) / 0.3)
    : 1.0;

  const effective = impactScore * urgencyFactor * loadPressureMultiplier;
  return Math.min(10.0, effective);
}

/**
 * Determine adjusted interval for auto-scalable tasks based on current system load.
 * Low load → tighter intervals (more frequent cycles).
 * High load → relaxed intervals (maintain minimum thresholds, avoid starvation).
 */
export function computeAutoScaledInterval(
  taskId: string,
  baseIntervalMs: number,
  systemLoadRatio: number,
): number {
  const profile = getSovereigntyProfile(taskId);
  if (!profile.autoScalable) return baseIntervalMs;

  const { minFrequencyMs, maxFrequencyMs } = profile;

  let scaledMs: number;

  if (systemLoadRatio < 0.30) {
    scaledMs = Math.round(baseIntervalMs * 0.60);
  } else if (systemLoadRatio < 0.50) {
    scaledMs = Math.round(baseIntervalMs * 0.80);
  } else if (systemLoadRatio < 0.70) {
    scaledMs = baseIntervalMs;
  } else if (systemLoadRatio < 0.85) {
    scaledMs = Math.round(baseIntervalMs * 1.25);
  } else {
    scaledMs = Math.round(baseIntervalMs * 1.60);
  }

  if (minFrequencyMs !== null) scaledMs = Math.max(minFrequencyMs, scaledMs);
  if (maxFrequencyMs !== null) scaledMs = Math.min(maxFrequencyMs, scaledMs);

  totalSovereigntyOps++;
  return scaledMs;
}

/**
 * Compute max concurrent task slots based on system load.
 * Ensures consciousness and AGI tasks are never starved.
 */
export function computeDynamicConcurrency(systemLoadRatio: number): number {
  if (systemLoadRatio < 0.30) return 8;
  if (systemLoadRatio < 0.50) return 6;
  if (systemLoadRatio < 0.70) return 4;
  if (systemLoadRatio < 0.85) return 2;
  return 1;
}

export function getScoringMetrics() {
  const profiles = Array.from(scoreCache.values());
  const byCategory: Record<string, number> = {};
  for (const p of profiles) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  return {
    registeredProfiles: scoreCache.size,
    totalScoreComputations,
    totalSovereigntyOps,
    byCategory,
    topProfiles: profiles
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)
      .map(p => ({ taskId: p.taskId, impactScore: p.impactScore, category: p.category })),
  };
}

export function getImpactScore(taskId: string): number {
  return getSovereigntyProfile(taskId).impactScore;
}
