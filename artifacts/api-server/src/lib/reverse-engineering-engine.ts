import { db } from "@workspace/db";
import { providerCallsTable, systemStateTable } from "@workspace/db";
import { eq, gte, desc, and } from "drizzle-orm";
import { logger } from "./logger";
import { upsertProviderProfile, getProviderConfigs } from "./provider-registry";
import { getProviderCallStats } from "./provider-call-logger";

export interface CapabilityProfile {
  providerId: string;
  providerName: string;
  isExternal: boolean;
  totalCalls: number;
  successCalls: number;
  errorRate: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p50LatencyMs: number | null;
  latencyStdDev: number | null;
  avgResponseLength: number | null;
  responseConsistency: number;
  errorClassification: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  capabilityScore: number;
  reliabilityScore: number;
  speedScore: number;
  hallucinationTendency: "low" | "medium" | "high" | "unknown";
  models: string[];
  analyzedAt: Date;
  profileAge: number;
  dataPoints: number;
  dynamicConfidence: number;
}

interface DynamicProfile {
  latencyPercentiles: { p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number } | null;
  latencyStdDev: number | null;
  avgResponseLength: number | null;
  responseLengthStdDev: number | null;
  responseConsistency: number;
  errorClassification: Record<string, number>;
  successStreak: number;
  recentTrend: "improving" | "stable" | "degrading" | "unknown";
  dataPoints: number;
}

const learnedProfiles = new Map<string, { profile: DynamicProfile; updatedAt: number }>();

async function buildDynamicProfile(providerId: string): Promise<DynamicProfile> {
  const since = new Date(Date.now() - 72 * 3600 * 1000);
  const rows = await db.select().from(providerCallsTable)
    .where(and(
      eq(providerCallsTable.providerId, providerId),
      gte(providerCallsTable.calledAt, since),
    ))
    .orderBy(desc(providerCallsTable.calledAt))
    .limit(500);

  if (rows.length === 0) {
    return {
      latencyPercentiles: null, latencyStdDev: null,
      avgResponseLength: null, responseLengthStdDev: null,
      responseConsistency: 0, errorClassification: {},
      successStreak: 0, recentTrend: "unknown", dataPoints: 0,
    };
  }

  const successful = rows.filter(r => r.status === "success");
  const latencies = successful.map(r => r.latencyMs).filter((v): v is number => v !== null).sort((a, b) => a - b);

  let latencyPercentiles = null;
  let latencyStdDev = null;
  if (latencies.length >= 3) {
    const pct = (p: number) => latencies[Math.floor(latencies.length * p)] ?? latencies[latencies.length - 1]!;
    latencyPercentiles = { p10: pct(0.1), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), p95: pct(0.95), p99: pct(0.99) };
    const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length;
    latencyStdDev = Math.sqrt(latencies.reduce((s, v) => s + (v - mean) ** 2, 0) / latencies.length);
  }

  const outputLengths = successful.map(r => r.outputTokens ?? 0).filter(v => v > 0);
  let avgResponseLength = null;
  let responseLengthStdDev = null;
  if (outputLengths.length >= 3) {
    avgResponseLength = outputLengths.reduce((s, v) => s + v, 0) / outputLengths.length;
    responseLengthStdDev = Math.sqrt(outputLengths.reduce((s, v) => s + (v - avgResponseLength!) ** 2, 0) / outputLengths.length);
  }

  const responseConsistency = avgResponseLength && responseLengthStdDev
    ? Math.max(0, 1 - responseLengthStdDev / avgResponseLength)
    : 0;

  const errorClassification: Record<string, number> = {};
  for (const row of rows.filter(r => r.status !== "success")) {
    const errMsg = row.error ?? "";
    const errType = errMsg.includes("timeout") ? "timeout"
      : errMsg.includes("rate") ? "rate_limit"
      : errMsg.includes("auth") ? "auth_error"
      : errMsg.includes("network") ? "network_error"
      : row.status !== "success" ? row.status
      : "unknown";
    errorClassification[errType] = (errorClassification[errType] || 0) + 1;
  }

  let successStreak = 0;
  for (const row of rows) {
    if (row.status === "success") successStreak++;
    else break;
  }

  let recentTrend: DynamicProfile["recentTrend"] = "unknown";
  if (rows.length >= 10) {
    const recentHalf = rows.slice(0, Math.floor(rows.length / 2));
    const olderHalf = rows.slice(Math.floor(rows.length / 2));
    const recentErrorRate = recentHalf.filter(r => r.status !== "success").length / recentHalf.length;
    const olderErrorRate = olderHalf.filter(r => r.status !== "success").length / olderHalf.length;
    if (recentErrorRate < olderErrorRate - 0.05) recentTrend = "improving";
    else if (recentErrorRate > olderErrorRate + 0.05) recentTrend = "degrading";
    else recentTrend = "stable";
  }

  return {
    latencyPercentiles, latencyStdDev,
    avgResponseLength, responseLengthStdDev,
    responseConsistency, errorClassification,
    successStreak, recentTrend, dataPoints: rows.length,
  };
}

function deriveStrengthsDynamic(dynamic: DynamicProfile, avgLatencyMs: number | null, errorRate: number): string[] {
  const strengths: string[] = [];

  if (avgLatencyMs !== null && avgLatencyMs < 1000) strengths.push("Fast inference (<1s)");
  if (avgLatencyMs !== null && avgLatencyMs < 500) strengths.push("Ultra-low latency (<500ms)");
  if (errorRate < 0.01 && dynamic.dataPoints >= 10) strengths.push("Highly reliable (>99% success)");
  else if (errorRate < 0.05 && dynamic.dataPoints >= 5) strengths.push("Reliable (>95% success)");

  if (dynamic.responseConsistency > 0.7) strengths.push("Consistent response quality");
  if (dynamic.successStreak >= 20) strengths.push(`Strong success streak (${dynamic.successStreak})`);
  if (dynamic.recentTrend === "improving") strengths.push("Performance trending upward");
  if (dynamic.latencyStdDev !== null && dynamic.latencyStdDev < 200) strengths.push("Predictable latency");
  if (dynamic.avgResponseLength !== null && dynamic.avgResponseLength > 500) strengths.push("Detailed responses");

  return strengths;
}

function deriveWeaknessesDynamic(dynamic: DynamicProfile, avgLatencyMs: number | null, errorRate: number): string[] {
  const weaknesses: string[] = [];

  if (avgLatencyMs !== null && avgLatencyMs > 5000) weaknesses.push("High latency (>5s)");
  if (avgLatencyMs !== null && avgLatencyMs > 10000) weaknesses.push("Very slow (>10s)");
  if (errorRate > 0.1) weaknesses.push(`High error rate (${(errorRate * 100).toFixed(1)}%)`);
  else if (errorRate > 0.05) weaknesses.push("Moderate error rate");

  if (dynamic.recentTrend === "degrading") weaknesses.push("Performance degrading recently");
  if (dynamic.responseConsistency > 0 && dynamic.responseConsistency < 0.3) weaknesses.push("Inconsistent response quality");
  if (dynamic.latencyStdDev !== null && dynamic.latencyStdDev > 2000) weaknesses.push("Unpredictable latency");
  if (dynamic.successStreak === 0 && dynamic.dataPoints > 0) weaknesses.push("Recent errors detected");

  const topErrors = Object.entries(dynamic.errorClassification).sort(([, a], [, b]) => b - a);
  for (const [errType, count] of topErrors.slice(0, 2)) {
    if (count >= 3) weaknesses.push(`Recurring ${errType} errors (${count}x)`);
  }

  return weaknesses;
}

function computeCapabilityScoreDynamic(dynamic: DynamicProfile, errorRate: number, avgLatencyMs: number | null, totalCalls: number): number {
  if (totalCalls === 0) return 50;
  const confidence = Math.min(1, totalCalls / 50);

  let baseScore = 70;
  if (errorRate < 0.01) baseScore += 15;
  else if (errorRate < 0.05) baseScore += 10;
  else if (errorRate < 0.1) baseScore += 5;
  else baseScore -= 10;

  if (avgLatencyMs !== null) {
    if (avgLatencyMs < 500) baseScore += 10;
    else if (avgLatencyMs < 1500) baseScore += 5;
    else if (avgLatencyMs > 5000) baseScore -= 10;
  }

  if (dynamic.responseConsistency > 0.7) baseScore += 5;
  if (dynamic.recentTrend === "improving") baseScore += 3;
  if (dynamic.recentTrend === "degrading") baseScore -= 5;
  if (dynamic.successStreak >= 10) baseScore += 2;

  baseScore = Math.max(10, Math.min(100, baseScore));
  return Math.round(baseScore * confidence + 50 * (1 - confidence));
}

function computeReliabilityScore(errorRate: number, totalCalls: number, dynamic: DynamicProfile): number {
  if (totalCalls === 0) return 50;
  const base = Math.max(0, (1 - errorRate) * 100);
  const confidence = Math.min(1, totalCalls / 20);
  let score = Math.round(base * confidence + 50 * (1 - confidence));

  if (dynamic.recentTrend === "improving") score = Math.min(100, score + 3);
  if (dynamic.recentTrend === "degrading") score = Math.max(0, score - 5);
  if (dynamic.successStreak >= 20) score = Math.min(100, score + 2);

  return score;
}

function computeSpeedScore(avgLatencyMs: number | null, dynamic: DynamicProfile): number {
  if (avgLatencyMs === null) return 50;
  let score: number;
  if (avgLatencyMs < 300) score = 100;
  else if (avgLatencyMs < 700) score = 90;
  else if (avgLatencyMs < 1500) score = 75;
  else if (avgLatencyMs < 3000) score = 60;
  else if (avgLatencyMs < 7000) score = 40;
  else score = 20;

  if (dynamic.latencyStdDev !== null) {
    const cv = dynamic.latencyStdDev / Math.max(avgLatencyMs, 1);
    if (cv < 0.3) score = Math.min(100, score + 5);
    else if (cv > 1.0) score = Math.max(0, score - 10);
  }

  return score;
}

function computeHallucinationTendency(
  dynamic: DynamicProfile,
  errorRate: number,
): "low" | "medium" | "high" | "unknown" {
  if (dynamic.dataPoints < 5) return "unknown";
  if (errorRate > 0.2) return "high";
  if (dynamic.responseConsistency < 0.2 && dynamic.dataPoints >= 10) return "high";
  if (dynamic.responseConsistency > 0.6 && errorRate < 0.05) return "low";
  if (errorRate < 0.1) return "medium";
  return "medium";
}

export interface ProfileFreshnessEntry {
  providerId: string;
  updatedAt: number;
  dataPoints: number;
  age: string;
  confidence: number;
  responseConsistency: number;
  recentTrend: "improving" | "stable" | "degrading" | "unknown";
  successStreak: number;
}

export function getLearnedProfileFreshness(): ProfileFreshnessEntry[] {
  const results: ProfileFreshnessEntry[] = [];
  for (const [id, entry] of learnedProfiles.entries()) {
    const ageMs = Date.now() - entry.updatedAt;
    const ageStr = ageMs < 60000 ? `${Math.round(ageMs / 1000)}s` : ageMs < 3600000 ? `${Math.round(ageMs / 60000)}m` : `${Math.round(ageMs / 3600000)}h`;
    const dp = entry.profile.dataPoints;
    const confidence = Math.min(1, dp / 100);
    results.push({
      providerId: id,
      updatedAt: entry.updatedAt,
      dataPoints: dp,
      age: ageStr,
      confidence,
      responseConsistency: entry.profile.responseConsistency,
      recentTrend: entry.profile.recentTrend,
      successStreak: entry.profile.successStreak,
    });
  }
  return results;
}

const LEARNED_PROFILES_STATE_KEY = "re_learned_profiles";

async function persistLearnedProfilesToDb(): Promise<void> {
  try {
    const payload: Record<string, { profile: DynamicProfile; updatedAt: number }> = {};
    for (const [id, entry] of learnedProfiles.entries()) {
      payload[id] = entry;
    }
    const existing = await db.select().from(systemStateTable)
      .where(eq(systemStateTable.key, LEARNED_PROFILES_STATE_KEY)).limit(1);
    if (existing.length > 0) {
      await db.update(systemStateTable)
        .set({ value: payload, lastSavedAt: new Date() })
        .where(eq(systemStateTable.key, LEARNED_PROFILES_STATE_KEY));
    } else {
      await db.insert(systemStateTable).values({
        key: LEARNED_PROFILES_STATE_KEY,
        value: payload,
        description: "Dynamic reverse-engineering provider profiles",
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to persist learned profiles to DB");
  }
}

export async function restoreLearnedProfilesFromDb(): Promise<number> {
  try {
    const rows = await db.select().from(systemStateTable)
      .where(eq(systemStateTable.key, LEARNED_PROFILES_STATE_KEY)).limit(1);
    if (rows.length === 0) return 0;

    const payload = rows[0].value as Record<string, { profile: Record<string, unknown>; updatedAt: number }>;
    if (!payload || typeof payload !== "object") return 0;

    let restored = 0;
    for (const [providerId, entry] of Object.entries(payload)) {
      if (!entry || typeof entry !== "object" || !entry.profile) continue;
      const dp = entry.profile;

      const restoredProfile: DynamicProfile = {
        latencyPercentiles: (dp.latencyPercentiles as DynamicProfile["latencyPercentiles"]) ?? null,
        latencyStdDev: typeof dp.latencyStdDev === "number" ? dp.latencyStdDev : null,
        avgResponseLength: typeof dp.avgResponseLength === "number" ? dp.avgResponseLength : null,
        responseLengthStdDev: typeof dp.responseLengthStdDev === "number" ? dp.responseLengthStdDev : null,
        responseConsistency: typeof dp.responseConsistency === "number" ? dp.responseConsistency : 0,
        errorClassification: (typeof dp.errorClassification === "object" && dp.errorClassification !== null ? dp.errorClassification : {}) as Record<string, number>,
        successStreak: typeof dp.successStreak === "number" ? dp.successStreak : 0,
        recentTrend: (["improving", "stable", "degrading", "unknown"].includes(dp.recentTrend as string) ? dp.recentTrend : "unknown") as DynamicProfile["recentTrend"],
        dataPoints: typeof dp.dataPoints === "number" ? dp.dataPoints : 0,
      };

      learnedProfiles.set(providerId, { profile: restoredProfile, updatedAt: entry.updatedAt ?? Date.now() });
      restored++;
    }
    return restored;
  } catch (err) {
    logger.error({ err }, "Failed to restore learned profiles from DB");
    return 0;
  }
}

export async function analyzeProvider(providerId: string): Promise<CapabilityProfile | null> {
  const config = getProviderConfigs().find(p => p.id === providerId);
  if (!config) return null;

  const stats = await getProviderCallStats(providerId, 72);
  const dynamic = await buildDynamicProfile(providerId);

  const previousEntry = learnedProfiles.get(providerId);
  const profileAgeMs = previousEntry ? Date.now() - previousEntry.updatedAt : 0;
  learnedProfiles.set(providerId, { profile: dynamic, updatedAt: Date.now() });

  const totalCalls = stats?.totalCalls ?? 0;
  const successCalls = stats?.successCalls ?? 0;
  const errorRate = stats?.errorRate ?? 0;
  const avgLatencyMs = stats?.avgLatencyMs ?? null;
  const p95LatencyMs = stats?.p95LatencyMs ?? null;
  const p50LatencyMs = dynamic.latencyPercentiles?.p50 ?? null;

  const strengths = deriveStrengthsDynamic(dynamic, avgLatencyMs, errorRate);
  const weaknesses = deriveWeaknessesDynamic(dynamic, avgLatencyMs, errorRate);
  const capabilityScore = computeCapabilityScoreDynamic(dynamic, errorRate, avgLatencyMs, totalCalls);
  const reliabilityScore = computeReliabilityScore(errorRate, totalCalls, dynamic);
  const speedScore = computeSpeedScore(avgLatencyMs, dynamic);
  const hallucinationTendency = computeHallucinationTendency(dynamic, errorRate);

  const dynamicConfidence = Math.min(1, dynamic.dataPoints / 100);

  const profile: CapabilityProfile = {
    providerId,
    providerName: config.name,
    isExternal: config.isExternal,
    totalCalls,
    successCalls,
    errorRate,
    avgLatencyMs,
    p95LatencyMs,
    p50LatencyMs,
    latencyStdDev: dynamic.latencyStdDev,
    avgResponseLength: dynamic.avgResponseLength,
    responseConsistency: dynamic.responseConsistency,
    errorClassification: dynamic.errorClassification,
    strengths,
    weaknesses,
    capabilityScore,
    reliabilityScore,
    speedScore,
    hallucinationTendency,
    models: config.models,
    analyzedAt: new Date(),
    profileAge: profileAgeMs,
    dataPoints: dynamic.dataPoints,
    dynamicConfidence,
  };

  await upsertProviderProfile(providerId, {
    totalCalls,
    successCalls,
    errorCalls: totalCalls - successCalls,
    avgLatencyMs: avgLatencyMs ?? undefined,
    p95LatencyMs: p95LatencyMs ?? undefined,
    errorRate,
    avgInputTokens: stats?.avgInputTokens ?? undefined,
    avgOutputTokens: stats?.avgOutputTokens ?? undefined,
    capabilities: config.capabilities,
    strengths,
    weaknesses,
    capabilityScore,
    reliabilityScore,
    speedScore,
    lastAnalyzedAt: new Date(),
  });

  await persistLearnedProfilesToDb();

  return profile;
}

export async function analyzeAllProviders(): Promise<CapabilityProfile[]> {
  if (learnedProfiles.size === 0) {
    const restored = await restoreLearnedProfilesFromDb();
    if (restored > 0) {
      logger.info({ restored }, "Restored learned provider profiles from database");
    }
  }

  const configs = getProviderConfigs();
  const profiles: CapabilityProfile[] = [];

  for (const config of configs) {
    try {
      const profile = await analyzeProvider(config.id);
      if (profile) profiles.push(profile);
    } catch (err) {
      logger.error({ err, providerId: config.id }, "Failed to analyze provider");
    }
  }

  logger.info({ count: profiles.length }, "Provider analysis complete");
  return profiles;
}

export async function compareProvidersForPrompt(
  prompt: string,
  providerIds: string[],
  responses: { providerId: string; text: string; latencyMs: number }[],
): Promise<{
  prompt: string;
  responses: typeof responses;
  similarities: Record<string, Record<string, number>>;
  winner: string | null;
  scores: Record<string, number>;
}> {
  const similarities: Record<string, Record<string, number>> = {};

  for (const r1 of responses) {
    similarities[r1.providerId] = {};
    for (const r2 of responses) {
      if (r1.providerId === r2.providerId) {
        similarities[r1.providerId][r2.providerId] = 1.0;
        continue;
      }
      const sim = computeTextSimilarity(r1.text, r2.text);
      similarities[r1.providerId][r2.providerId] = sim;
    }
  }

  const scores: Record<string, number> = {};
  for (const r of responses) {
    const lengthScore = Math.min(1, r.text.length / 200) * 30;
    const speedScore = Math.max(0, 1 - r.latencyMs / 10000) * 30;
    const avgSim = Object.values(similarities[r.providerId] ?? {})
      .filter((_, i) => Object.keys(similarities[r.providerId] ?? {})[i] !== r.providerId)
      .reduce((s, v) => s + v, 0);
    const simScore = responses.length > 1 ? (avgSim / (responses.length - 1)) * 40 : 40;
    scores[r.providerId] = Math.round(lengthScore + speedScore + simScore);
  }

  const winner = responses.length > 0
    ? responses.reduce((best, r) => (scores[r.providerId] ?? 0) > (scores[best.providerId] ?? 0) ? r : best).providerId
    : null;

  return { prompt, responses, similarities, winner, scores };
}

function computeTextSimilarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const bWords = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
