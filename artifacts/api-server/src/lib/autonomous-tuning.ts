import { db } from "@workspace/db";
import { tuningDecisionsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "./logger";
import { getCacheStats } from "./semantic-cache";
import { getBatcherStats } from "./llm-batcher";
import { getLLMStats } from "./llm-client";
import { getEmbeddingStats, setNeuralPreference } from "./neural-embeddings";
import { getDistillationStats } from "./knowledge-distillation";
import { getSelfEvaluationMetrics } from "./self-evaluation";

let rescheduleFn: ((newIntervalMs: number) => void) | null = null;

export function setRescheduleFn(fn: (newIntervalMs: number) => void): void {
  rescheduleFn = fn;
}

export interface TuningState {
  loopIntervalMs: number;
  cacheThreshold: number;
  ingestionPriority: number;
  embeddingWeight: number;
  batcherWindowMs: number;
  knowledgeConfidenceThreshold: number;
  lastTunedAt: number;
  totalAdjustments: number;
  cyclesSinceLastTune: number;
}

const tuningState: TuningState = {
  loopIntervalMs: 120_000,
  cacheThreshold: 0.85,
  ingestionPriority: 0.5,
  embeddingWeight: 1.0,
  batcherWindowMs: 2_000,
  knowledgeConfidenceThreshold: 0.80,
  lastTunedAt: 0,
  totalAdjustments: 0,
  cyclesSinceLastTune: 0,
};

const MIN_CYCLES_BETWEEN_TUNES = 3;

async function persistTuningDecision(metric: string, parameter: string, oldValue: number, newValue: number, reason: string, cycleNumber: number): Promise<void> {
  try {
    await db.insert(tuningDecisionsTable).values({
      metric,
      parameter,
      oldValue,
      newValue,
      reason,
      cycleNumber,
    });
  } catch (err) {
    logger.warn({ err, parameter }, "AutonomousTuning: persist failed");
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export async function runAutonomousTuning(cycleNumber: number, cycleDurationMs: number, phaseErrorCount: number): Promise<{ adjustments: Array<{ parameter: string; from: number; to: number; reason: string }> }> {
  tuningState.cyclesSinceLastTune++;

  if (tuningState.cyclesSinceLastTune < MIN_CYCLES_BETWEEN_TUNES) {
    return { adjustments: [] };
  }

  const adjustments: Array<{ parameter: string; from: number; to: number; reason: string }> = [];

  const cacheStats = getCacheStats();
  const batcherStats = getBatcherStats();
  const llmStats = getLLMStats();
  const embeddingStats = getEmbeddingStats();
  let distillStats: Awaited<ReturnType<typeof getDistillationStats>> | null = null;
  try { distillStats = await getDistillationStats(); } catch {}

  if (cycleDurationMs > tuningState.loopIntervalMs * 0.8) {
    const oldVal = tuningState.loopIntervalMs;
    const newVal = clamp(Math.round(oldVal * 1.15), 60_000, 600_000);
    if (newVal !== oldVal) {
      tuningState.loopIntervalMs = newVal;
      if (rescheduleFn) rescheduleFn(newVal);
      adjustments.push({ parameter: "loopIntervalMs", from: oldVal, to: newVal, reason: `Cycle duration ${cycleDurationMs}ms approaching interval limit — increased by 15%` });
      await persistTuningDecision("cycleDuration", "loopIntervalMs", oldVal, newVal, `Cycle took ${cycleDurationMs}ms, ${((cycleDurationMs / oldVal) * 100).toFixed(0)}% of interval`, cycleNumber);
    }
  } else if (cycleDurationMs < tuningState.loopIntervalMs * 0.3 && tuningState.loopIntervalMs > 60_000) {
    const oldVal = tuningState.loopIntervalMs;
    const newVal = clamp(Math.round(oldVal * 0.9), 60_000, 600_000);
    if (newVal !== oldVal) {
      tuningState.loopIntervalMs = newVal;
      if (rescheduleFn) rescheduleFn(newVal);
      adjustments.push({ parameter: "loopIntervalMs", from: oldVal, to: newVal, reason: `Cycle completing fast (${cycleDurationMs}ms) — tightened interval by 10%` });
      await persistTuningDecision("cycleDuration", "loopIntervalMs", oldVal, newVal, `Fast cycle ${cycleDurationMs}ms, only ${((cycleDurationMs / oldVal) * 100).toFixed(0)}% of interval`, cycleNumber);
    }
  }

  if (cacheStats.hitRate < 0.2 && cacheStats.totalHits + cacheStats.totalMisses > 10) {
    const oldVal = tuningState.cacheThreshold;
    const newVal = clamp(oldVal - 0.05, 0.5, 0.95);
    if (newVal !== oldVal) {
      tuningState.cacheThreshold = newVal;
      adjustments.push({ parameter: "cacheThreshold", from: oldVal, to: newVal, reason: `Low cache hit rate (${(cacheStats.hitRate * 100).toFixed(1)}%) — lowered similarity threshold` });
      await persistTuningDecision("cacheHitRate", "cacheThreshold", oldVal, newVal, `Cache hit rate ${(cacheStats.hitRate * 100).toFixed(1)}%`, cycleNumber);
    }
  } else if (cacheStats.hitRate > 0.8) {
    const oldVal = tuningState.cacheThreshold;
    const newVal = clamp(oldVal + 0.02, 0.5, 0.95);
    if (newVal !== oldVal) {
      tuningState.cacheThreshold = newVal;
      adjustments.push({ parameter: "cacheThreshold", from: oldVal, to: newVal, reason: `High cache hit rate (${(cacheStats.hitRate * 100).toFixed(1)}%) — raised quality threshold` });
      await persistTuningDecision("cacheHitRate", "cacheThreshold", oldVal, newVal, `Cache hit rate ${(cacheStats.hitRate * 100).toFixed(1)}%`, cycleNumber);
    }
  }

  if (phaseErrorCount > 2) {
    const oldVal = tuningState.ingestionPriority;
    const newVal = clamp(oldVal - 0.1, 0.1, 1.0);
    if (newVal !== oldVal) {
      tuningState.ingestionPriority = newVal;
      adjustments.push({ parameter: "ingestionPriority", from: oldVal, to: newVal, reason: `${phaseErrorCount} phase errors — reducing ingestion load to improve stability` });
      await persistTuningDecision("phaseErrors", "ingestionPriority", oldVal, newVal, `${phaseErrorCount} errors in last cycle`, cycleNumber);
    }
  } else if (phaseErrorCount === 0 && tuningState.ingestionPriority < 0.8) {
    const oldVal = tuningState.ingestionPriority;
    const newVal = clamp(oldVal + 0.05, 0.1, 1.0);
    if (newVal !== oldVal) {
      tuningState.ingestionPriority = newVal;
      adjustments.push({ parameter: "ingestionPriority", from: oldVal, to: newVal, reason: "Clean cycle with no errors — increasing ingestion throughput" });
      await persistTuningDecision("stability", "ingestionPriority", oldVal, newVal, "Zero errors, stable system", cycleNumber);
    }
  }

  if (batcherStats.reductionRate > 0.5 && tuningState.batcherWindowMs < 5_000) {
    const oldVal = tuningState.batcherWindowMs;
    const newVal = clamp(oldVal + 500, 1_000, 5_000);
    if (newVal !== oldVal) {
      tuningState.batcherWindowMs = newVal;
      adjustments.push({ parameter: "batcherWindowMs", from: oldVal, to: newVal, reason: `High batch reduction rate (${(batcherStats.reductionRate * 100).toFixed(0)}%) — widened batch window` });
      await persistTuningDecision("batcherReduction", "batcherWindowMs", oldVal, newVal, `${(batcherStats.reductionRate * 100).toFixed(0)}% reduction rate`, cycleNumber);
    }
  }

  if (embeddingStats.neuralRate < 0.3 && embeddingStats.neuralCalls + embeddingStats.fallbackCalls > 5) {
    const oldVal = tuningState.embeddingWeight;
    const newVal = clamp(oldVal + 0.15, 0.5, 2.0);
    if (newVal !== oldVal) {
      tuningState.embeddingWeight = newVal;
      setNeuralPreference(newVal);
      adjustments.push({ parameter: "embeddingWeight", from: oldVal, to: newVal, reason: `Low neural embedding rate (${(embeddingStats.neuralRate * 100).toFixed(1)}%) — increased neural preference weight` });
      await persistTuningDecision("embeddingNeuralRate", "embeddingWeight", oldVal, newVal, `Neural rate ${(embeddingStats.neuralRate * 100).toFixed(1)}%, boosting preference`, cycleNumber);
    }
  } else if (embeddingStats.neuralRate > 0.9 && tuningState.embeddingWeight > 1.0) {
    const oldVal = tuningState.embeddingWeight;
    const newVal = clamp(oldVal - 0.1, 0.5, 2.0);
    if (newVal !== oldVal) {
      tuningState.embeddingWeight = newVal;
      setNeuralPreference(newVal);
      adjustments.push({ parameter: "embeddingWeight", from: oldVal, to: newVal, reason: `High neural embedding rate (${(embeddingStats.neuralRate * 100).toFixed(1)}%) — normalizing weight` });
      await persistTuningDecision("embeddingNeuralRate", "embeddingWeight", oldVal, newVal, `Neural rate ${(embeddingStats.neuralRate * 100).toFixed(1)}%, reducing to baseline`, cycleNumber);
    }
  }

  if (distillStats && distillStats.hitRate < 0.1 && distillStats.totalFacts > 20) {
    const oldVal = tuningState.knowledgeConfidenceThreshold;
    const newVal = clamp(oldVal - 0.05, 0.5, 0.95);
    if (newVal !== oldVal) {
      tuningState.knowledgeConfidenceThreshold = newVal;
      adjustments.push({ parameter: "knowledgeConfidenceThreshold", from: oldVal, to: newVal, reason: `Low knowledge hit rate (${(distillStats.hitRate * 100).toFixed(1)}%) with ${distillStats.totalFacts} facts — lowered confidence threshold` });
      await persistTuningDecision("knowledgeHitRate", "knowledgeConfidenceThreshold", oldVal, newVal, `${distillStats.totalFacts} facts, ${(distillStats.hitRate * 100).toFixed(1)}% hit rate`, cycleNumber);
    }
  }

  if (adjustments.length > 0) {
    tuningState.totalAdjustments += adjustments.length;
    tuningState.lastTunedAt = Date.now();
    tuningState.cyclesSinceLastTune = 0;
    logger.info({ adjustments: adjustments.length, cycleNumber }, "AutonomousTuning: configuration adjusted");
  }

  return { adjustments };
}

export function getTuningState(): TuningState {
  return { ...tuningState };
}

export function getIngestionPriority(): number {
  return tuningState.ingestionPriority;
}

export function getCacheThreshold(): number {
  return tuningState.cacheThreshold;
}

export function getBatcherWindowMs(): number {
  return tuningState.batcherWindowMs;
}

export function getKnowledgeConfidenceThreshold(): number {
  return tuningState.knowledgeConfidenceThreshold;
}

export async function getTuningHistory(limit = 20): Promise<Array<typeof tuningDecisionsTable.$inferSelect>> {
  try {
    return await db.select().from(tuningDecisionsTable).orderBy(desc(tuningDecisionsTable.createdAt)).limit(limit);
  } catch {
    return [];
  }
}

export function getTuningMetrics() {
  return {
    currentState: { ...tuningState },
    totalAdjustments: tuningState.totalAdjustments,
    lastTunedAt: tuningState.lastTunedAt,
    cyclesSinceLastTune: tuningState.cyclesSinceLastTune,
    autoTuningEnabled: true,
  };
}
