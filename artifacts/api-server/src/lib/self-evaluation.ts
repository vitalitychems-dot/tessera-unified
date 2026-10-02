import { db } from "@workspace/db";
import { selfEvaluationTable } from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";
import { logger } from "./logger";
import { getCacheStats, setCacheTtl } from "./semantic-cache";
import { getDistillationStats, setConfidenceThreshold } from "./knowledge-distillation";
import { getEmbeddingStats } from "./neural-embeddings";
import { getBatcherStats } from "./llm-batcher";
import { getLLMStats } from "./llm-client";

interface EvalResult {
  cycleNumber: number;
  overallScore: number;
  cacheHitRate: number;
  knowledgeHitRate: number;
  embeddingQuality: number;
  llmCallsReduced: number;
  sourceScores: Record<string, number>;
  adjustments: Record<string, unknown>;
  weakAreas: string[];
  strongAreas: string[];
}

const CONFIDENCE_THRESHOLD_DEFAULT = 0.6;

const evalState = {
  totalEvaluations: 0,
  lastResult: null as EvalResult | null,
  avgScore: 0,
};

function scoreComponent(name: string, value: number, target: number): { score: number; status: string } {
  const ratio = value / Math.max(target, 0.001);
  const score = Math.min(ratio, 1.0);
  const status = score >= 0.8 ? "strong" : score >= 0.5 ? "adequate" : "weak";
  return { score, status };
}

export async function runSelfEvaluation(cycleNumber: number): Promise<EvalResult> {
  const cacheStats = getCacheStats();
  const distillStats = await getDistillationStats();
  const embeddingStats = getEmbeddingStats();
  const batcherStats = getBatcherStats();
  const llmStats = getLLMStats();

  const cacheScore = scoreComponent("cache", cacheStats.hitRate, 0.3);
  const knowledgeScore = scoreComponent("knowledge", distillStats.hitRate, 0.2);
  const embeddingScore = scoreComponent("embeddings", embeddingStats.cacheSize / 100, 1.0);
  const batchEfficiency = scoreComponent(
    "batcher",
    batcherStats.totalDeduplicated / Math.max(batcherStats.totalBatched, 1),
    0.1,
  );

  const sourceScores: Record<string, number> = {
    semanticCache: cacheScore.score,
    knowledgeDistillation: knowledgeScore.score,
    neuralEmbeddings: embeddingScore.score,
    requestBatching: batchEfficiency.score,
  };

  const weakAreas: string[] = [];
  const strongAreas: string[] = [];
  const adjustments: Record<string, unknown> = {};

  for (const [name, score] of Object.entries(sourceScores)) {
    if (score >= 0.8) strongAreas.push(name);
    if (score < 0.5) weakAreas.push(name);
  }

  const llmCallsReduced = llmStats.cacheHits + batcherStats.totalDeduplicated;

  if (cacheStats.hitRate < 0.1 && llmStats.totalCalls > 50) {
    const newTtl = Math.min(cacheStats.ttlSeconds * 1.5, 86400);
    setCacheTtl(newTtl);
    adjustments.cacheTtlIncrease = { applied: true, newTtl };
  }
  if (distillStats.hitRate < 0.1 && distillStats.totalFacts > 20) {
    const newThreshold = Math.max(CONFIDENCE_THRESHOLD_DEFAULT - 0.1, 0.3);
    setConfidenceThreshold(newThreshold);
    adjustments.lowerConfidenceThreshold = { applied: true, newThreshold };
  }
  if (cacheStats.hitRate > 0.6 && llmStats.totalCalls > 100) {
    const newTtl = Math.max(cacheStats.ttlSeconds * 0.8, 300);
    setCacheTtl(newTtl);
    adjustments.cacheTtlDecrease = { applied: true, newTtl };
  }

  const weights = [0.35, 0.25, 0.2, 0.2];
  const scores = [cacheScore.score, knowledgeScore.score, embeddingScore.score, batchEfficiency.score];
  const overallScore = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

  const result: EvalResult = {
    cycleNumber,
    overallScore: Math.round(overallScore * 1000) / 1000,
    cacheHitRate: cacheStats.hitRate,
    knowledgeHitRate: distillStats.hitRate,
    embeddingQuality: embeddingScore.score,
    llmCallsReduced,
    sourceScores,
    adjustments,
    weakAreas,
    strongAreas,
  };

  try {
    await db.insert(selfEvaluationTable).values({
      cycleNumber,
      overallScore: result.overallScore,
      cacheHitRate: result.cacheHitRate,
      knowledgeHitRate: result.knowledgeHitRate,
      embeddingQuality: result.embeddingQuality,
      llmCallsReduced: result.llmCallsReduced,
      sourceScores: result.sourceScores,
      adjustments: result.adjustments,
      weakAreas: result.weakAreas,
      strongAreas: result.strongAreas,
    });
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SelfEvaluation: persist error");
  }

  evalState.totalEvaluations++;
  evalState.lastResult = result;
  evalState.avgScore = evalState.totalEvaluations === 1
    ? overallScore
    : (evalState.avgScore * (evalState.totalEvaluations - 1) + overallScore) / evalState.totalEvaluations;

  logger.info({
    cycle: cycleNumber,
    score: result.overallScore,
    weak: weakAreas,
    strong: strongAreas,
    llmReduced: llmCallsReduced,
  }, "SelfEvaluation: cycle complete");

  return result;
}

export async function getEvaluationHistory(limit = 20) {
  try {
    return await db
      .select()
      .from(selfEvaluationTable)
      .orderBy(desc(selfEvaluationTable.evaluatedAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export function getSelfEvaluationMetrics() {
  return {
    totalEvaluations: evalState.totalEvaluations,
    avgScore: Math.round(evalState.avgScore * 1000) / 1000,
    lastResult: evalState.lastResult,
  };
}
