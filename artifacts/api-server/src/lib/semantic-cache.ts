import * as crypto from "crypto";
import { db } from "@workspace/db";
import { semanticCacheTable } from "@workspace/db/schema";
import { eq, sql, gt } from "drizzle-orm";
import { logger } from "./logger";
import { generateEmbedding, cosineSimilarity } from "./neural-embeddings";
import { semanticDimensionalCache } from "./dimensional-lru-cache";

let DEFAULT_TTL_SECONDS = 3600;
const SIMILARITY_THRESHOLD = 0.92;
const MAX_CACHE_SIZE = 5000;

interface CacheStats {
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  cacheSize: number;
  hitRate: number;
}

const stats: CacheStats & { dimensionalHits: number; crossDimensionHits: number } = {
  totalHits: 0,
  totalMisses: 0,
  totalEvictions: 0,
  cacheSize: 0,
  hitRate: 0,
  dimensionalHits: 0,
  crossDimensionHits: 0,
};

function hashPrompt(messages: Array<{ role: string; content: string }>, model: string): string {
  const key = messages.map(m => `${m.role}:${m.content}`).join("|") + `|model:${model}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

const SYSTEM_FP_PREFIX = "@@sysfp:";

function fingerprintSystemContext(messages: Array<{ role: string; content: string }>, model: string): string {
  const systemContent = messages.filter(m => m.role === "system").map(m => m.content).join("|");
  if (systemContent.length === 0) return "";
  return crypto.createHash("sha256").update(model + "|sys:" + systemContent.slice(0, 500)).digest("hex").slice(0, 16);
}

function extractStoredFingerprint(promptText: string): string {
  const idx = promptText.indexOf(SYSTEM_FP_PREFIX);
  if (idx === -1) return "";
  return promptText.slice(idx + SYSTEM_FP_PREFIX.length, idx + SYSTEM_FP_PREFIX.length + 16);
}

function updateHitRate(): void {
  const total = stats.totalHits + stats.totalMisses;
  stats.hitRate = total > 0 ? stats.totalHits / total : 0;
}

export async function lookupCache(
  messages: Array<{ role: string; content: string }>,
  model: string,
  dimension: string = "general",
): Promise<string | null> {
  const hash = hashPrompt(messages, model);

  const dimResult = semanticDimensionalCache.lookup(hash, dimension);
  if (dimResult && Date.now() - dimResult.value.ts < DEFAULT_TTL_SECONDS * 1000) {
    stats.totalHits++;
    stats.dimensionalHits++;
    if (dimResult.dimension !== dimension) stats.crossDimensionHits++;
    updateHitRate();
    logger.info({ hash: hash.slice(0, 12), dimension: dimResult.dimension }, "SemanticCache: dimensional hit");
    return dimResult.value.response;
  }

  try {
    const [exact] = await db
      .select()
      .from(semanticCacheTable)
      .where(eq(semanticCacheTable.promptHash, hash))
      .limit(1);

    if (exact && new Date(exact.expiresAt) > new Date()) {
      stats.totalHits++;
      updateHitRate();
      await db.update(semanticCacheTable)
        .set({ hitCount: sql`${semanticCacheTable.hitCount} + 1`, lastHitAt: new Date() })
        .where(eq(semanticCacheTable.id, exact.id));

      semanticDimensionalCache.set(hash, { response: exact.response, ts: Date.now() }, dimension, [`model:${model}`]);

      logger.info({ hash: hash.slice(0, 12) }, "SemanticCache: exact hit");
      return exact.response;
    }

    const userContent = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
    if (userContent.length < 10) {
      stats.totalMisses++;
      updateHitRate();
      return null;
    }

    const queryEmbedding = await generateEmbedding(userContent, dimension);
    const systemFp = fingerprintSystemContext(messages, model);

    const candidates = await db
      .select()
      .from(semanticCacheTable)
      .where(sql`${semanticCacheTable.expiresAt} > now() AND ${semanticCacheTable.model} = ${model}`)
      .limit(200);

    let bestMatch: typeof candidates[0] | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const emb = candidate.embedding as number[];
      if (!Array.isArray(emb) || emb.length === 0) continue;

      const candidateStoredFp = extractStoredFingerprint(candidate.promptText);
      if (systemFp.length > 0 && candidateStoredFp.length > 0 && systemFp !== candidateStoredFp) continue;

      const score = cosineSimilarity(queryEmbedding, emb);
      if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      stats.totalHits++;
      updateHitRate();
      await db.update(semanticCacheTable)
        .set({ hitCount: sql`${semanticCacheTable.hitCount} + 1`, lastHitAt: new Date() })
        .where(eq(semanticCacheTable.id, bestMatch.id));

      semanticDimensionalCache.set(hash, { response: bestMatch.response, ts: Date.now() }, dimension, [`model:${model}`, `match:${bestMatch.promptHash.slice(0, 12)}`]);

      logger.info({ score: bestScore.toFixed(3), hash: bestMatch.promptHash.slice(0, 12) }, "SemanticCache: semantic hit");
      return bestMatch.response;
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: lookup error");
  }

  stats.totalMisses++;
  updateHitRate();
  return null;
}

export async function storeInCache(
  messages: Array<{ role: string; content: string }>,
  model: string,
  response: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  dimension: string = "general",
): Promise<void> {
  const hash = hashPrompt(messages, model);
  const userContent = messages.filter(m => m.role === "user").map(m => m.content).join(" ");
  const sysFp = fingerprintSystemContext(messages, model);
  const promptTextWithFp = sysFp.length > 0
    ? `${userContent.slice(0, 4900)}${SYSTEM_FP_PREFIX}${sysFp}`
    : userContent.slice(0, 5000);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  try {
    let embedding: number[] = [];
    if (userContent.length >= 10) {
      embedding = await generateEmbedding(userContent, dimension);
    }

    await db.insert(semanticCacheTable).values({
      promptHash: hash,
      promptText: promptTextWithFp,
      embedding,
      response: response.slice(0, 50000),
      model,
      ttlSeconds,
      expiresAt,
    }).onConflictDoUpdate({
      target: semanticCacheTable.promptHash,
      set: {
        response: response.slice(0, 50000),
        embedding,
        ttlSeconds,
        expiresAt,
        hitCount: 0,
        createdAt: new Date(),
        lastHitAt: null,
      },
    });

    semanticDimensionalCache.set(hash, { response: response.slice(0, 50000), ts: Date.now() }, dimension);

    const [countRow] = await db.select({ cnt: sql<number>`count(*)::int` }).from(semanticCacheTable);
    stats.cacheSize = countRow?.cnt ?? 0;

    if (stats.cacheSize > MAX_CACHE_SIZE) {
      await evictExpired();
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: store error");
  }
}

export async function evictExpired(): Promise<number> {
  try {
    const result = await db.delete(semanticCacheTable)
      .where(sql`${semanticCacheTable.expiresAt} < now()`)
      .returning({ id: semanticCacheTable.id });
    const evicted = result.length;
    stats.totalEvictions += evicted;
    if (evicted > 0) {
      logger.info({ evicted }, "SemanticCache: evicted expired entries");
    }
    return evicted;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: eviction error");
    return 0;
  }
}

export async function invalidateCache(): Promise<void> {
  try {
    await db.delete(semanticCacheTable);
    stats.cacheSize = 0;
    semanticDimensionalCache.clear();
    logger.info("SemanticCache: full invalidation");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: invalidation error");
  }
}

export function getCacheStats(): CacheStats & { ttlSeconds: number; dimensionalHits: number; crossDimensionHits: number; dimensionalCache: ReturnType<typeof semanticDimensionalCache.getStats>; speedup: { avoidedDbQueries: number; estimatedTimeSavedMs: number } } {
  const avoidedDbQueries = stats.dimensionalHits + stats.crossDimensionHits;
  const estimatedTimeSavedMs = avoidedDbQueries * 15;
  return {
    ...stats,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    dimensionalCache: semanticDimensionalCache.getStats(),
    speedup: { avoidedDbQueries, estimatedTimeSavedMs },
  };
}

export function setCacheTtl(ttl: number): void {
  DEFAULT_TTL_SECONDS = Math.max(300, Math.min(ttl, 86400));
  logger.info({ ttl: DEFAULT_TTL_SECONDS }, "SemanticCache: TTL updated");
}

export async function invalidateRelatedEntries(keywords: string[]): Promise<number> {
  if (keywords.length === 0) return 0;
  try {
    let totalEvicted = 0;
    for (const keyword of keywords.slice(0, 5)) {
      if (keyword.length < 4) continue;
      const result = await db.delete(semanticCacheTable)
        .where(sql`${semanticCacheTable.promptText} ILIKE ${"%" + keyword + "%"} AND ${semanticCacheTable.expiresAt} > now()`)
        .returning({ id: semanticCacheTable.id });
      totalEvicted += result.length;
    }
    stats.totalEvictions += totalEvicted;
    if (totalEvicted > 0) {
      logger.info({ evicted: totalEvicted, keywords: keywords.slice(0, 3) }, "SemanticCache: targeted invalidation");
    }
    return totalEvicted;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: targeted invalidation error");
    return 0;
  }
}

export async function initSemanticCache(): Promise<void> {
  try {
    await evictExpired();
    const [countRow] = await db.select({ cnt: sql<number>`count(*)::int` }).from(semanticCacheTable);
    stats.cacheSize = countRow?.cnt ?? 0;
    logger.info({ cacheSize: stats.cacheSize }, "SemanticCache: initialized");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "SemanticCache: init error");
  }
}
