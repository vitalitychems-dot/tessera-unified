import { db } from "@workspace/db";
import { selfCritiqueLogTable } from "@workspace/db/schema";
import { desc, gte } from "drizzle-orm";
import { logger } from "./logger";
import { validateResponse } from "./response-validation-engine";
import { analyzeTruthfulnessV2 } from "./truthfulness-engine";
import { searchMemory } from "./vector-memory";
import { recallIngestedKnowledge } from "./ingested-recall";

const DEFAULT_PASS_SCORE = 0.6;
const DEFAULT_MAX_ATTEMPTS = 2;
const PER_STAGE_TIMEOUT_MS = 2500;
const CONTEXT_GATHER_TIMEOUT_MS = 2000;

export const INTERNAL_GROUNDING_OPEN = "<!--INTERNAL_GROUNDING_CONTEXT_START-->";
export const INTERNAL_GROUNDING_CLOSE = "<!--INTERNAL_GROUNDING_CONTEXT_END-->";
const INTERNAL_BLOCK_RE = new RegExp(
  `${INTERNAL_GROUNDING_OPEN}[\\s\\S]*?${INTERNAL_GROUNDING_CLOSE}`,
  "g",
);

export function stripInternalGroundingBlocks(text: string): string {
  if (!text) return text;
  return text.replace(INTERNAL_BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, ms);
    p.then(v => { if (!done) { done = true; clearTimeout(t); resolve(v); } }).catch(() => { if (!done) { done = true; clearTimeout(t); resolve(fallback); } });
  });
}

export interface CritiqueAttemptRecord {
  attempt: number;
  content: string;
  groundingScore: number;
  truthfulnessScore: number;
  hallucinationSeverity: "none" | "low" | "medium" | "high";
  verdict: "safe" | "caution" | "warning" | "reject";
  passed: boolean;
  wasModified: boolean;
  sourcesCount: number;
}

export interface CritiqueResult {
  finalResponse: string;
  passed: boolean;
  attempts: number;
  groundingScore: number;
  truthfulnessScore: number;
  hallucinationSeverity: "none" | "low" | "medium" | "high";
  verdict: "safe" | "caution" | "warning" | "reject";
  sources: string[];
  attemptHistory: CritiqueAttemptRecord[];
  totalTimeMs: number;
}

export interface CritiqueOptions {
  maxAttempts?: number;
  passScore?: number;
  persist?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Generator {
  (ctx: { attempt: number; refinedContext: string }): Promise<string>;
}

async function gatherRefinedContext(userQuery: string, priorResponse: string): Promise<string> {
  const lines: string[] = [];
  const memories = await withTimeout(searchMemory(userQuery, 5).catch(() => []), CONTEXT_GATHER_TIMEOUT_MS, [] as Awaited<ReturnType<typeof searchMemory>>);
  for (const m of memories.slice(0, 4)) {
    lines.push(`[memory:${m.category}] ${m.content.slice(0, 240)}`);
  }
  const ingested = await withTimeout(recallIngestedKnowledge(userQuery, 3).catch(() => [] as string[]), CONTEXT_GATHER_TIMEOUT_MS, [] as string[]);
  for (const item of ingested.slice(0, 3)) lines.push(`[ingested] ${item.slice(0, 240)}`);
  if (priorResponse) lines.push(`[prior-draft-for-reference] ${priorResponse.slice(0, 400)}`);
  return lines.join("\n");
}

async function critiqueOne(content: string, userQuery: string, passScore: number): Promise<{
  validatedContent: string;
  groundingScore: number;
  truthfulnessScore: number;
  hallucinationSeverity: "none" | "low" | "medium" | "high";
  verdict: "safe" | "caution" | "warning" | "reject";
  sources: string[];
  passed: boolean;
  wasModified: boolean;
}> {
  const [validation, truth] = await Promise.all([
    withTimeout(
      validateResponse(content, userQuery).catch(err => {
        logger.warn({ err: (err as Error).message }, "self-critique: validateResponse failed");
        return null;
      }),
      PER_STAGE_TIMEOUT_MS,
      null,
    ),
    withTimeout(
      analyzeTruthfulnessV2(content).catch(err => {
        logger.warn({ err: (err as Error).message }, "self-critique: truthfulness analysis failed");
        return null;
      }),
      PER_STAGE_TIMEOUT_MS,
      null,
    ),
  ]);

  const groundingScore = validation?.overallGroundingScore ?? 0;
  const truthScore = truth?.overallTruthScore ?? 0;
  const hSeverity = truth?.hallucinationCheck.severity ?? "none";
  const verdict = truth?.recommendation ?? "caution";
  const sources: string[] = [];
  if (validation) {
    for (const c of validation.passedClaims) {
      if (c.bestMatchSource && c.bestMatchSource !== "none" && c.bestMatchSource !== "timeout") {
        sources.push(c.bestMatchSource);
      }
    }
  }
  if (truth) {
    for (const v of truth.verificationResults) {
      for (const s of v.sources) sources.push(s.slice(0, 80));
    }
  }
  const uniqueSources = [...new Set(sources)].slice(0, 15);

  const validatedContent = validation?.validatedResponse ?? content;
  const wasModified = validation?.wasModified ?? false;

  const passed =
    groundingScore >= passScore &&
    truthScore >= passScore &&
    hSeverity !== "high" &&
    verdict !== "reject" &&
    verdict !== "warning";

  return {
    validatedContent,
    groundingScore,
    truthfulnessScore: truthScore,
    hallucinationSeverity: hSeverity,
    verdict,
    sources: uniqueSources,
    passed,
    wasModified,
  };
}

export async function runCritiqueLoop(
  userQuery: string,
  generator: Generator,
  opts: CritiqueOptions = {},
): Promise<CritiqueResult> {
  const start = Date.now();
  const passScore = opts.passScore ?? DEFAULT_PASS_SCORE;
  const maxAttempts = Math.max(1, Math.min(5, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));
  const persist = opts.persist !== false;

  const history: CritiqueAttemptRecord[] = [];
  let bestIdx = 0;
  let bestScore = -1;
  let bestContent = "";
  let bestSources: string[] = [];
  let bestVerdict: CritiqueAttemptRecord["verdict"] = "caution";
  let bestSeverity: CritiqueAttemptRecord["hallucinationSeverity"] = "none";
  let bestGround = 0;
  let bestTruth = 0;
  let passed = false;

  let refinedContext = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let draft: string;
    try {
      draft = await generator({ attempt, refinedContext });
    } catch (err) {
      logger.warn({ err: (err as Error).message, attempt }, "self-critique: generator threw");
      draft = bestContent || "";
      if (!draft) continue;
    }

    const c = await critiqueOne(draft, userQuery, passScore);
    const compositeScore = 0.5 * c.groundingScore + 0.5 * c.truthfulnessScore;

    history.push({
      attempt,
      content: c.validatedContent.slice(0, 500),
      groundingScore: c.groundingScore,
      truthfulnessScore: c.truthfulnessScore,
      hallucinationSeverity: c.hallucinationSeverity,
      verdict: c.verdict,
      passed: c.passed,
      wasModified: c.wasModified,
      sourcesCount: c.sources.length,
    });

    if (compositeScore > bestScore) {
      bestScore = compositeScore;
      bestContent = stripInternalGroundingBlocks(c.validatedContent);
      bestSources = c.sources;
      bestVerdict = c.verdict;
      bestSeverity = c.hallucinationSeverity;
      bestGround = c.groundingScore;
      bestTruth = c.truthfulnessScore;
      bestIdx = attempt;
    }

    if (c.passed) {
      passed = true;
      break;
    }

    if (attempt < maxAttempts) {
      refinedContext = await gatherRefinedContext(userQuery, draft);
    }
  }

  const result: CritiqueResult = {
    finalResponse: bestContent,
    passed,
    attempts: history.length,
    groundingScore: bestGround,
    truthfulnessScore: bestTruth,
    hallucinationSeverity: bestSeverity,
    verdict: bestVerdict,
    sources: bestSources,
    attemptHistory: history,
    totalTimeMs: Date.now() - start,
  };

  if (persist) {
    db.insert(selfCritiqueLogTable).values({
      userQuery: userQuery.slice(0, 1000),
      finalResponse: result.finalResponse.slice(0, 4000),
      attempts: result.attempts,
      passed: result.passed,
      groundingScore: Math.round(result.groundingScore * 1000),
      truthfulnessScore: Math.round(result.truthfulnessScore * 1000),
      hallucinationSeverity: result.hallucinationSeverity,
      sources: result.sources,
      verdict: result.verdict,
      attemptHistory: history,
      metadata: { bestAttempt: bestIdx, passScore, maxAttempts, ...(opts.metadata ?? {}) },
    }).catch(err => logger.debug({ err: (err as Error).message }, "self-critique: persist failed"));
  }

  return result;
}

export async function getSelfCritiqueStats(windowHours = 24): Promise<{
  totalInWindow: number;
  passed: number;
  failed: number;
  passRate: number;
  avgAttempts: number;
  avgGroundingScore: number;
  avgTruthfulnessScore: number;
  avgResponseChars: number;
  severityCounts: Record<string, number>;
  verdictCounts: Record<string, number>;
}> {
  const since = new Date(Date.now() - windowHours * 3600_000);
  try {
    const rows = await db.select().from(selfCritiqueLogTable).where(gte(selfCritiqueLogTable.createdAt, since)).orderBy(desc(selfCritiqueLogTable.createdAt)).limit(5000);
    const total = rows.length;
    const passed = rows.filter(r => r.passed).length;
    const avgAttempts = total > 0 ? rows.reduce((s, r) => s + (r.attempts ?? 1), 0) / total : 0;
    const avgGround = total > 0 ? rows.reduce((s, r) => s + (r.groundingScore ?? 0), 0) / total / 1000 : 0;
    const avgTruth = total > 0 ? rows.reduce((s, r) => s + (r.truthfulnessScore ?? 0), 0) / total / 1000 : 0;
    const avgChars = total > 0 ? rows.reduce((s, r) => s + (r.finalResponse?.length ?? 0), 0) / total : 0;
    const severityCounts: Record<string, number> = {};
    const verdictCounts: Record<string, number> = {};
    for (const r of rows) {
      severityCounts[r.hallucinationSeverity] = (severityCounts[r.hallucinationSeverity] ?? 0) + 1;
      verdictCounts[r.verdict] = (verdictCounts[r.verdict] ?? 0) + 1;
    }
    return {
      totalInWindow: total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? passed / total : 0,
      avgAttempts: Math.round(avgAttempts * 100) / 100,
      avgGroundingScore: Math.round(avgGround * 1000) / 1000,
      avgTruthfulnessScore: Math.round(avgTruth * 1000) / 1000,
      avgResponseChars: Math.round(avgChars),
      severityCounts,
      verdictCounts,
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "getSelfCritiqueStats failed");
    return {
      totalInWindow: 0, passed: 0, failed: 0, passRate: 0,
      avgAttempts: 0, avgGroundingScore: 0, avgTruthfulnessScore: 0,
      avgResponseChars: 0, severityCounts: {}, verdictCounts: {},
    };
  }
}

export async function getRecentSelfCritiques(limit = 20) {
  try {
    return await db.select({
      id: selfCritiqueLogTable.id,
      userQuery: selfCritiqueLogTable.userQuery,
      passed: selfCritiqueLogTable.passed,
      attempts: selfCritiqueLogTable.attempts,
      groundingScore: selfCritiqueLogTable.groundingScore,
      truthfulnessScore: selfCritiqueLogTable.truthfulnessScore,
      hallucinationSeverity: selfCritiqueLogTable.hallucinationSeverity,
      verdict: selfCritiqueLogTable.verdict,
      sources: selfCritiqueLogTable.sources,
      createdAt: selfCritiqueLogTable.createdAt,
    }).from(selfCritiqueLogTable).orderBy(desc(selfCritiqueLogTable.createdAt)).limit(Math.min(100, limit));
  } catch {
    return [];
  }
}
