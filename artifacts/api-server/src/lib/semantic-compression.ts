import { db } from "@workspace/db";
import { distilledKnowledgeTable, knowledgeCanonicalTable, compressionRunTable } from "@workspace/db/schema";
import { eq, sql, desc, gt, inArray, ne, isNotNull, and } from "drizzle-orm";
import { generateEmbedding, generateEmbeddingsBatch, cosineSimilarity } from "./neural-embeddings";
import { logger } from "./logger";
import * as crypto from "crypto";

const DEDUP_SIMILARITY_THRESHOLD = 0.92;
const MIN_PHRASE_LENGTH = 4;
const MIN_PHRASE_FREQ = 3;
const MAX_DICT_ENTRIES = 512;
const RATE_LIMIT_MS = 30_000;

type FactRow = Omit<typeof distilledKnowledgeTable.$inferSelect, "fact"> & { fact: string };

// In-memory O(1) portal-jump: canonicalId -> entry; backed by domain index.

interface PortalEntry {
  canonicalId: number;
  fact: string;
  encodedFact: string | null;
  encodedDictRunId: string | null;
  domains: string[];
  confidence: number;
  embedding: number[];
}

const portalJumpTable = new Map<number, PortalEntry>();
const domainIndex = new Map<string, Set<number>>();

const retrievalSamples: number[] = [];
const MAX_RETRIEVAL_SAMPLES = 200;

function recordRetrievalMs(ms: number): void {
  retrievalSamples.push(ms);
  if (retrievalSamples.length > MAX_RETRIEVAL_SAMPLES) retrievalSamples.shift();
}

export function getAvgRetrievalMs(): number {
  if (retrievalSamples.length === 0) return 0;
  return retrievalSamples.reduce((a, b) => a + b, 0) / retrievalSamples.length;
}

function portalJumpSet(entry: PortalEntry): void {
  portalJumpTable.set(entry.canonicalId, entry);
  for (const domain of entry.domains) {
    if (!domainIndex.has(domain)) domainIndex.set(domain, new Set());
    domainIndex.get(domain)!.add(entry.canonicalId);
  }
}

export function portalJumpResolve(canonicalId: number): PortalEntry | null {
  const t0 = Date.now();
  const entry = portalJumpTable.get(canonicalId) ?? null;
  recordRetrievalMs(Date.now() - t0);
  return entry;
}

export function portalJumpByDomain(domain: string): PortalEntry[] {
  const t0 = Date.now();
  const ids = domainIndex.get(domain);
  const result = ids ? [...ids].map(id => portalJumpTable.get(id)!).filter(Boolean) : [];
  recordRetrievalMs(Date.now() - t0);
  return result;
}

export function getPortalJumpStats() {
  return {
    totalEntries: portalJumpTable.size,
    domainsIndexed: domainIndex.size,
    avgRetrievalMs: Math.round(getAvgRetrievalMs() * 1000) / 1000,
    domainBreakdown: Object.fromEntries(
      [...domainIndex.entries()].map(([d, ids]) => [d, ids.size])
    ),
  };
}

// Dictionary compression: replace frequent phrases with Unicode PUA tokens (U+E000/U+E001).
// Lossless: phrases are captured in original casing; encode is case-sensitive substitution;
// decode(encode(x)) === x. Version-safe: each canonical row stores the runId whose
// dictionary encoded it; dictCache allows decoding across rebuilds.

interface EntropyDictionary {
  phraseToToken: Map<string, string>;
  tokenToPhrase: Map<string, string>;
  version: number;
}

let globalDictionary: EntropyDictionary = {
  phraseToToken: new Map(),
  tokenToPhrase: new Map(),
  version: 0,
};

// Cache of dictionary snapshots by runId — populated on startup warm-load and after
// each pipeline run. Allows decoding of encoded facts from any prior run version.
const dictCache = new Map<string, EntropyDictionary>();

function buildDictionary(facts: string[]): EntropyDictionary {
  const phraseFreq = new Map<string, number>();

  for (const fact of facts) {
    // Split preserving original casing — lossless round-trip requires no case normalisation
    const words = fact.split(/\s+/).filter(w => w.length >= 2);
    for (let len = 2; len <= 5; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(" ");
        if (phrase.length >= MIN_PHRASE_LENGTH) {
          phraseFreq.set(phrase, (phraseFreq.get(phrase) ?? 0) + 1);
        }
      }
    }
  }

  const candidates = [...phraseFreq.entries()]
    .filter(([, freq]) => freq >= MIN_PHRASE_FREQ)
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)
    .slice(0, MAX_DICT_ENTRIES);

  const phraseToToken = new Map<string, string>();
  const tokenToPhrase = new Map<string, string>();

  for (let i = 0; i < candidates.length; i++) {
    const token = `\uE000${i.toString(36)}\uE001`;
    phraseToToken.set(candidates[i][0], token);
    tokenToPhrase.set(token, candidates[i][0]);
  }

  return {
    phraseToToken,
    tokenToPhrase,
    version: (globalDictionary.version ?? 0) + 1,
  };
}

function entropyEncode(text: string, dict: EntropyDictionary): string {
  let result = text;
  for (const [phrase, token] of dict.phraseToToken) {
    result = result.split(phrase).join(token);
  }
  return result;
}

function entropyDecode(encoded: string, dict: EntropyDictionary): string {
  let result = encoded;
  for (const [token, phrase] of dict.tokenToPhrase) {
    result = result.split(token).join(phrase);
  }
  return result;
}

// Version-safe decode: uses the cached dictionary for the given runId, falls back to globalDictionary.
export function decodeCanonicalFact(encodedFact: string, dictRunId?: string | null): string {
  const dict = (dictRunId ? dictCache.get(dictRunId) ?? globalDictionary : globalDictionary);
  return entropyDecode(encodedFact, dict);
}

function dictionaryFromPairs(pairs: Array<{ phrase: string; token: string }>, version: number): EntropyDictionary {
  const phraseToToken = new Map<string, string>();
  const tokenToPhrase = new Map<string, string>();
  for (const { phrase, token } of pairs) {
    phraseToToken.set(phrase, token);
    tokenToPhrase.set(token, phrase);
  }
  return { phraseToToken, tokenToPhrase, version };
}

function dictionaryToPairs(dict: EntropyDictionary): Array<{ phrase: string; token: string }> {
  return [...dict.phraseToToken.entries()].map(([phrase, token]) => ({ phrase, token }));
}

// Two-phase dedup: Phase 1 matches new facts against existing canonicals (cross-run);
// Phase 2 clusters unmatched new facts among themselves.

interface DeduplicationGroup {
  representative: FactRow;
  members: FactRow[];
  domains: string[];
  avgConfidence: number;
  matchedCanonicalId: number | null;
}

async function semanticDeduplicationPass(
  facts: FactRow[],
  existingCanonicals: Map<number, { embedding: number[]; domains: string[] }>,
): Promise<DeduplicationGroup[]> {
  if (facts.length === 0) return [];

  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddingsBatch(facts.map(f => f.fact));
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: batch embedding failed, dedup will use empty vectors");
    embeddings = facts.map(() => []);
  }

  const assigned = new Uint8Array(facts.length);
  const groups: DeduplicationGroup[] = [];

  // Phase 1: match each fact against existing canonical entries
  const existingEntries = [...existingCanonicals.entries()];
  for (let i = 0; i < facts.length; i++) {
    if (assigned[i]) continue;
    const embI = embeddings[i];
    if (!embI || embI.length === 0) continue;

    let bestCanonicalId: number | null = null;
    let bestScore = 0;
    for (const [cid, canon] of existingEntries) {
      if (canon.embedding.length === 0) continue;
      const sim = cosineSimilarity(embI, canon.embedding);
      if (sim >= DEDUP_SIMILARITY_THRESHOLD && sim > bestScore) {
        bestScore = sim;
        bestCanonicalId = cid;
      }
    }

    if (bestCanonicalId !== null) {
      assigned[i] = 1;
      const domains = [...new Set([...existingCanonicals.get(bestCanonicalId)!.domains, facts[i].category])];
      groups.push({
        representative: facts[i],
        members: [facts[i]],
        domains,
        avgConfidence: facts[i].confidence,
        matchedCanonicalId: bestCanonicalId,
      });
    }
  }

  // Phase 2: cluster unmatched new facts among themselves
  for (let i = 0; i < facts.length; i++) {
    if (assigned[i]) continue;
    const embI = embeddings[i];

    const group: FactRow[] = [facts[i]];
    assigned[i] = 1;

    if (embI && embI.length > 0) {
      for (let j = i + 1; j < facts.length; j++) {
        if (assigned[j]) continue;
        const embJ = embeddings[j];
        if (embJ && embJ.length > 0 && cosineSimilarity(embI, embJ) >= DEDUP_SIMILARITY_THRESHOLD) {
          group.push(facts[j]);
          assigned[j] = 1;
        }
      }
    }

    const domains = [...new Set(group.map(f => f.category))];
    const avgConfidence = group.reduce((s, f) => s + f.confidence, 0) / group.length;
    const representative = group.reduce((best, f) => f.confidence > best.confidence ? f : best, group[0]);

    groups.push({ representative, members: group, domains, avgConfidence, matchedCanonicalId: null });
  }

  return groups;
}

// Upsert canonical entries. When updating a matched canonical, re-encodes the stored
// canonicalFact (not the matched fact) to keep canonicalFact ↔ encodedFact in sync.

async function upsertCanonical(
  group: DeduplicationGroup,
  dict: EntropyDictionary,
  runId: string,
): Promise<number> {
  const { representative, members, domains, avgConfidence, matchedCanonicalId } = group;
  const sourceIds = members.map(m => m.id);

  // If we matched an existing canonical, update metadata only.
  // Re-encode using the STORED canonicalFact text to maintain canonical↔encoded consistency.
  if (matchedCanonicalId !== null) {
    const [existing] = await db
      .select()
      .from(knowledgeCanonicalTable)
      .where(eq(knowledgeCanonicalTable.id, matchedCanonicalId))
      .limit(1);

    if (existing) {
      const mergedDomains = [...new Set([...(existing.domains as string[]), ...domains])];
      const mergedSourceIds = [...new Set([...(existing.sourceIds as number[]), ...sourceIds])];
      // Encode the STORED canonicalFact (not the matched fact) — keeps them in sync
      const canonicalText = existing.canonicalFact;
      const encoded = entropyEncode(canonicalText, dict);
      const originalBytes = Buffer.byteLength(canonicalText, "utf8");
      const compressedBytes = Buffer.byteLength(encoded, "utf8");
      const ratio = originalBytes > 0 ? compressedBytes / originalBytes : 1.0;

      let embedding: number[] = (existing.embedding as number[]) ?? [];
      if (embedding.length === 0) {
        try { embedding = await generateEmbedding(canonicalText); } catch (err) {
          logger.debug({ err: (err as Error).message }, "SemanticCompression: embedding generation failed for matched canonical");
        }
      }

      await db
        .update(knowledgeCanonicalTable)
        .set({
          domains: mergedDomains,
          sourceIds: mergedSourceIds,
          confidence: Math.max(existing.confidence, avgConfidence),
          encodedFact: encoded,
          encodedDictRunId: runId,
          compressionRatio: ratio,
          embedding,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeCanonicalTable.id, matchedCanonicalId));

      const updated = portalJumpTable.get(matchedCanonicalId);
      if (updated) {
        portalJumpSet({ ...updated, domains: mergedDomains, encodedFact: encoded, encodedDictRunId: runId, embedding });
      }
      return matchedCanonicalId;
    }
  }

  // No embedding match — check for exact-text duplicate from a previous run
  const [existing] = await db
    .select()
    .from(knowledgeCanonicalTable)
    .where(eq(knowledgeCanonicalTable.canonicalFact, representative.fact))
    .limit(1);

  const canonicalText = representative.fact;
  const encoded = entropyEncode(canonicalText, dict);
  const originalBytes = Buffer.byteLength(canonicalText, "utf8");
  const compressedBytes = Buffer.byteLength(encoded, "utf8");
  const ratio = originalBytes > 0 ? compressedBytes / originalBytes : 1.0;

  let embedding: number[] = [];
  try { embedding = await generateEmbedding(canonicalText); } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: embedding generation failed for new canonical");
  }

  if (existing) {
    const mergedDomains = [...new Set([...(existing.domains as string[]), ...domains])];
    const mergedSourceIds = [...new Set([...(existing.sourceIds as number[]), ...sourceIds])];
    await db
      .update(knowledgeCanonicalTable)
      .set({
        domains: mergedDomains,
        sourceIds: mergedSourceIds,
        confidence: Math.max(existing.confidence, avgConfidence),
        encodedFact: encoded,
        encodedDictRunId: runId,
        compressionRatio: ratio,
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeCanonicalTable.id, existing.id));

    portalJumpSet({
      canonicalId: existing.id,
      fact: canonicalText,
      encodedFact: encoded,
      encodedDictRunId: runId,
      domains: mergedDomains,
      confidence: Math.max(existing.confidence, avgConfidence),
      embedding,
    });
    return existing.id;
  }

  const [inserted] = await db
    .insert(knowledgeCanonicalTable)
    .values({
      canonicalFact: canonicalText,
      encodedFact: encoded,
      encodedDictRunId: runId,
      embedding,
      domains,
      sourceIds,
      confidence: avgConfidence,
      compressionRatio: ratio,
    })
    .returning({ id: knowledgeCanonicalTable.id });

  portalJumpSet({
    canonicalId: inserted.id,
    fact: canonicalText,
    encodedFact: encoded,
    encodedDictRunId: runId,
    domains,
    confidence: avgConfidence,
    embedding,
  });

  return inserted.id;
}

// Compression metrics tracking

interface CompressionMetrics {
  totalInputFacts: number;
  totalCanonicalFacts: number;
  duplicatesRemoved: number;
  /** Actual byte count of all input fact strings for this run. */
  originalBytes: number;
  /** Byte count of encodedFact strings stored in knowledge_canonical for this run.
   *  Note: canonical_fact (plaintext) is also stored as a search index; encoded_fact
   *  is the compressed representation. compressionRatio reflects encoded vs raw input. */
  compressedBytes: number;
  compressionRatio: number;
  /** Percentage reduction from encoding: (1 - compressedBytes/originalBytes) * 100 */
  storageReductionPct: number;
  /** Percentage of input facts that were deduplicated into fewer canonicals.
   *  Measures semantic dedup savings independently of encoding compression. */
  deduplicationRate: number;
  avgRetrievalMs: number;
  portalJumpEntries: number;
  dictionarySize: number;
  durationMs: number;
  runId: string;
}

const compressionMetricsHistory: CompressionMetrics[] = [];
let lastRunMetrics: CompressionMetrics | null = null;
let lastRunTimestamp = 0;

export function getCompressionMetrics(): {
  lastRun: CompressionMetrics | null;
  history: CompressionMetrics[];
  portalJump: ReturnType<typeof getPortalJumpStats>;
  dictionaryVersion: number;
  dictionarySize: number;
} {
  return {
    lastRun: lastRunMetrics,
    history: compressionMetricsHistory.slice(-20),
    portalJump: getPortalJumpStats(),
    dictionaryVersion: globalDictionary.version,
    dictionarySize: globalDictionary.phraseToToken.size,
  };
}

// Main pipeline orchestrator

let pipelineRunning = false;

export async function runCompressionPipeline(opts: {
  batchSize?: number;
  rebuildDictionary?: boolean;
  minConfidence?: number;
} = {}): Promise<CompressionMetrics> {
  const now = Date.now();
  if (pipelineRunning) {
    logger.info("SemanticCompression: pipeline already running, skipping");
    return lastRunMetrics ?? buildEmptyMetrics();
  }
  if (now - lastRunTimestamp < RATE_LIMIT_MS) {
    logger.info({ waitMs: RATE_LIMIT_MS - (now - lastRunTimestamp) }, "SemanticCompression: rate-limited, skipping");
    return lastRunMetrics ?? buildEmptyMetrics();
  }
  pipelineRunning = true;
  lastRunTimestamp = now;
  const startMs = Date.now();
  const runId = `cpr-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;

  logger.info({ runId }, "SemanticCompression: pipeline started");

  try {
    const minConf = opts.minConfidence ?? 0.5;

    // Only process rows that still have fact text — rows nullified by a prior run are
    // already canonicalized and need no further processing this pass.
    const allFacts = (await db
      .select()
      .from(distilledKnowledgeTable)
      .where(and(gt(distilledKnowledgeTable.confidence, minConf), isNotNull(distilledKnowledgeTable.fact)))
      .orderBy(desc(distilledKnowledgeTable.confidence))
      .limit(5000)) as FactRow[];

    if (allFacts.length === 0) {
      const empty = buildEmptyMetrics(runId, startMs);
      await persistRunMetrics(empty, []);
      lastRunMetrics = empty;
      compressionMetricsHistory.push(empty);
      if (compressionMetricsHistory.length > 50) compressionMetricsHistory.shift();
      return empty;
    }

    if (opts.rebuildDictionary || globalDictionary.phraseToToken.size === 0) {
      globalDictionary = buildDictionary(allFacts.map(f => f.fact));
      logger.info({ dictSize: globalDictionary.phraseToToken.size }, "SemanticCompression: dictionary rebuilt");
    }

    // Cache the current dictionary snapshot under this runId so future decode calls
    // for facts encoded in this run are version-safe even after later rebuilds.
    dictCache.set(runId, globalDictionary);

    // Ensure portal-jump table is hydrated from DB for cross-run dedup.
    // If empty (fresh process not yet warmed by setImmediate), load now.
    if (portalJumpTable.size === 0) {
      await loadPortalJumpTableFromDb();
    }

    // Build existing canonical map for cross-run deduplication from in-memory table
    const existingCanonicals = new Map<number, { embedding: number[]; domains: string[] }>();
    for (const [id, entry] of portalJumpTable) {
      existingCanonicals.set(id, { embedding: entry.embedding, domains: entry.domains });
    }

    // Run deduplication on ALL facts at once, then batch the DB writes
    const groups = await semanticDeduplicationPass(allFacts, existingCanonicals);

    const totalInputFacts = allFacts.length;
    // Track unique canonical IDs produced this run (avoids double-counting
    // when the same existing canonical ID is updated by multiple groups).
    const touchedCanonicalIds = new Set<number>();
    let duplicatesRemoved = 0;
    let originalBytes = 0;
    let compressedBytes = 0;

    const DB_WRITE_BATCH = opts.batchSize ?? 50;
    for (let i = 0; i < groups.length; i += DB_WRITE_BATCH) {
      const batchGroups = groups.slice(i, i + DB_WRITE_BATCH);
      for (const group of batchGroups) {
        // originalBytes = sum of ALL member bytes (true corpus size before dedup).
        // compressedBytes = bytes of the single encoded canonical stored for this group.
        for (const m of group.members) {
          originalBytes += Buffer.byteLength(m.fact, "utf8");
        }
        duplicatesRemoved += group.members.length - 1;
        const repText = group.representative.fact;
        const canonicalId = await upsertCanonical(group, globalDictionary, runId);
        touchedCanonicalIds.add(canonicalId);
        const encoded = entropyEncode(repText, globalDictionary);
        compressedBytes += Buffer.byteLength(encoded, "utf8");

        // Lossless pointer writeback:
        // - EXACT matches (member.fact === canonicalText): null out fact; text is preserved
        //   verbatim in knowledge_canonical.canonical_fact — zero information loss.
        // - SIMILAR but non-identical members: keep fact text; set only canonicalId pointer.
        //   Their unique content is preserved in distilled_knowledge while the pointer
        //   enables dedup-aware retrieval via the canonical store.
        const canonicalText = group.representative.fact;
        const exactIds = group.members.filter(m => m.fact === canonicalText).map(m => m.id).filter(id => id != null);
        const similarIds = group.members.filter(m => m.fact !== canonicalText).map(m => m.id).filter(id => id != null);
        try {
          if (exactIds.length > 0) {
            await db.update(distilledKnowledgeTable).set({ canonicalId, fact: null }).where(inArray(distilledKnowledgeTable.id, exactIds));
          }
          if (similarIds.length > 0) {
            await db.update(distilledKnowledgeTable).set({ canonicalId }).where(inArray(distilledKnowledgeTable.id, similarIds));
          }
        } catch (err) {
          logger.debug({ err: (err as Error).message }, "SemanticCompression: canonical pointer writeback error");
        }
      }
    }

    const totalCanonicalFacts = touchedCanonicalIds.size;

    // Compute actual storage reduction from real DB byte counts.
    // originalBytes = in-memory bytes from this run's input rows.
    // compressedBytes = bytes of encoded canonical text (what's stored in canonical at rest).
    const compressionRatio = originalBytes > 0 ? compressedBytes / originalBytes : 1.0;
    const storageReductionPct = Math.round((1 - compressionRatio) * 10000) / 100;
    const durationMs = Date.now() - startMs;
    const avgRetMs = Math.round(getAvgRetrievalMs() * 1000) / 1000;

    const deduplicationRate = totalInputFacts > 0
      ? Math.round(((totalInputFacts - totalCanonicalFacts) / totalInputFacts) * 10000) / 100
      : 0;

    const metrics: CompressionMetrics = {
      runId,
      totalInputFacts,
      totalCanonicalFacts,
      duplicatesRemoved,
      originalBytes,
      compressedBytes,
      compressionRatio: Math.round(compressionRatio * 10000) / 10000,
      storageReductionPct,
      deduplicationRate,
      avgRetrievalMs: avgRetMs,
      portalJumpEntries: portalJumpTable.size,
      dictionarySize: globalDictionary.phraseToToken.size,
      durationMs,
    };

    await persistRunMetrics(metrics, dictionaryToPairs(globalDictionary));
    lastRunMetrics = metrics;
    compressionMetricsHistory.push(metrics);
    if (compressionMetricsHistory.length > 50) compressionMetricsHistory.shift();

    logger.info({
      runId,
      totalInputFacts,
      totalCanonicalFacts,
      duplicatesRemoved,
      compressionRatio: compressionRatio.toFixed(4),
      storageReductionPct,
      avgRetMs,
      durationMs,
    }, "SemanticCompression: pipeline complete");

    return metrics;
  } catch (err) {
    logger.error({ err: (err as Error).message, runId }, "SemanticCompression: pipeline error");
    const empty = buildEmptyMetrics(runId, startMs);
    lastRunMetrics = empty;
    compressionMetricsHistory.push(empty);
    if (compressionMetricsHistory.length > 50) compressionMetricsHistory.shift();
    return empty;
  } finally {
    pipelineRunning = false;
  }
}

async function persistRunMetrics(
  metrics: CompressionMetrics,
  dictPairs: Array<{ phrase: string; token: string }>,
): Promise<void> {
  try {
    await db.insert(compressionRunTable).values({
      runId: metrics.runId,
      totalInputFacts: metrics.totalInputFacts,
      totalCanonicalFacts: metrics.totalCanonicalFacts,
      duplicatesRemoved: metrics.duplicatesRemoved,
      originalBytes: metrics.originalBytes,
      compressedBytes: metrics.compressedBytes,
      compressionRatio: metrics.compressionRatio,
      avgRetrievalMs: metrics.avgRetrievalMs,
      portalJumpEntries: metrics.portalJumpEntries,
      dictionarySize: metrics.dictionarySize,
      durationMs: metrics.durationMs,
      dictionaryData: dictPairs,
    }).onConflictDoUpdate({
      target: compressionRunTable.runId,
      set: {
        durationMs: metrics.durationMs,
        avgRetrievalMs: metrics.avgRetrievalMs,
        dictionaryData: dictPairs,
      },
    });
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: could not persist run metrics");
  }
}

function buildEmptyMetrics(runId = `cpr-empty-${Date.now()}`, startMs = Date.now()): CompressionMetrics {
  return {
    runId,
    totalInputFacts: 0,
    totalCanonicalFacts: 0,
    duplicatesRemoved: 0,
    originalBytes: 0,
    compressedBytes: 0,
    compressionRatio: 1.0,
    storageReductionPct: 0,
    deduplicationRate: 0,
    avgRetrievalMs: getAvgRetrievalMs(),
    portalJumpEntries: portalJumpTable.size,
    dictionarySize: globalDictionary.phraseToToken.size,
    durationMs: Date.now() - startMs,
  };
}

// Incremental compression for newly ingested facts

export async function compressNewFacts(factTexts: string[], category: string): Promise<void> {
  if (factTexts.length === 0) return;

  if (globalDictionary.phraseToToken.size === 0) {
    try {
      const contextFacts = await db
        .select({ fact: distilledKnowledgeTable.fact })
        .from(distilledKnowledgeTable)
        .where(and(gt(distilledKnowledgeTable.confidence, 0.5), isNotNull(distilledKnowledgeTable.fact)))
        .limit(300);
      const allTexts = [...contextFacts.map(f => f.fact as string), ...factTexts];
      globalDictionary = buildDictionary(allTexts);
      logger.debug({ dictSize: globalDictionary.phraseToToken.size }, "SemanticCompression: lazy dictionary built");
    } catch (err) {
      logger.debug({ err: (err as Error).message }, "SemanticCompression: lazy dictionary build failed, skipping incremental compression");
      return;
    }
  }

  let rows: FactRow[] = [];
  try {
    rows = (await db
      .select()
      .from(distilledKnowledgeTable)
      .where(and(inArray(distilledKnowledgeTable.fact, factTexts.slice(0, 100)), isNotNull(distilledKnowledgeTable.fact)))
      .limit(factTexts.length)) as FactRow[];
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: incremental fact lookup failed");
  }

  if (rows.length === 0) return;

  const existingCanonicals = new Map<number, { embedding: number[]; domains: string[] }>();
  for (const [id, entry] of portalJumpTable) {
    existingCanonicals.set(id, { embedding: entry.embedding, domains: entry.domains });
  }

  const incrementalRunId = `cpr-inc-${Date.now().toString(36)}`;
  // Cache incremental dict snapshot so its encoded facts decode correctly later
  dictCache.set(incrementalRunId, globalDictionary);

  try {
    const groups = await semanticDeduplicationPass(rows, existingCanonicals);
    for (const group of groups) {
      // Explicitly merge the ingestion-time category into each group's domains.
      // This ensures cross-domain pointer links are added even when a fact already
      // exists in DB under a different category (row.category may differ from category).
      if (!group.domains.includes(category)) {
        group.domains = [...group.domains, category];
      }
      const canonicalId = await upsertCanonical(group, globalDictionary, incrementalRunId);
      // Lossless pointer writeback: null fact only for exact matches; similar-but-different
      // members keep their fact text and get only the canonicalId pointer.
      const incCanonicalText = group.representative.fact;
      const incExactIds = group.members.filter(m => m.fact === incCanonicalText).map(m => m.id).filter(id => id != null);
      const incSimilarIds = group.members.filter(m => m.fact !== incCanonicalText).map(m => m.id).filter(id => id != null);
      try {
        if (incExactIds.length > 0) {
          await db.update(distilledKnowledgeTable).set({ canonicalId, fact: null }).where(inArray(distilledKnowledgeTable.id, incExactIds));
        }
        if (incSimilarIds.length > 0) {
          await db.update(distilledKnowledgeTable).set({ canonicalId }).where(inArray(distilledKnowledgeTable.id, incSimilarIds));
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "SemanticCompression: incremental canonical pointer writeback error");
      }
    }
    logger.debug({ count: groups.length, category }, "SemanticCompression: incremental compression done");
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: incremental compression error");
  }
}

// Public lookup helpers

export function lookupCanonicalByDomain(domain: string): PortalEntry[] {
  return portalJumpByDomain(domain);
}

export async function getRecentCompressionRuns(limit = 10): Promise<typeof compressionRunTable.$inferSelect[]> {
  return db
    .select()
    .from(compressionRunTable)
    .orderBy(desc(compressionRunTable.createdAt))
    .limit(limit);
}

// Hydrates portal-jump table and dictionary cache from DB. Clears state first to prevent
// stale index drift. Restores all dictionary snapshots referenced by canonical rows.
export async function loadPortalJumpTableFromDb(): Promise<number> {
  try {
    portalJumpTable.clear();
    domainIndex.clear();

    const rows = await db
      .select()
      .from(knowledgeCanonicalTable)
      .orderBy(desc(knowledgeCanonicalTable.updatedAt))
      .limit(10000);

    // Collect all distinct encodedDictRunIds referenced in canonical rows
    const missingRunIds = new Set<string>();
    for (const row of rows) {
      portalJumpSet({
        canonicalId: row.id,
        fact: row.canonicalFact,
        encodedFact: row.encodedFact ?? null,
        encodedDictRunId: row.encodedDictRunId ?? null,
        domains: (row.domains as string[]) ?? [],
        confidence: row.confidence,
        embedding: (row.embedding as number[]) ?? [],
      });
      if (row.encodedDictRunId && !dictCache.has(row.encodedDictRunId)) {
        missingRunIds.add(row.encodedDictRunId);
      }
    }

    // Fetch and cache all missing dictionary versions in one query.
    // Also always fetch the latest run with dictionaryData as a fallback for
    // cases where canonical rows predate the encodedDictRunId column.
    try {
      const runIds = [...missingRunIds];
      let dictRuns: Array<{ runId: string; dictionaryData: unknown; id: number }> = [];

      if (runIds.length > 0) {
        dictRuns = await db
          .select({ runId: compressionRunTable.runId, dictionaryData: compressionRunTable.dictionaryData, id: compressionRunTable.id })
          .from(compressionRunTable)
          .where(inArray(compressionRunTable.runId, runIds));
      }

      // Always try to load the most recent run with a non-empty dictionaryData
      // so decoding works even for canonical rows that predate the versioning column
      const [latestWithDict] = await db
        .select({ runId: compressionRunTable.runId, dictionaryData: compressionRunTable.dictionaryData, id: compressionRunTable.id })
        .from(compressionRunTable)
        .orderBy(desc(compressionRunTable.createdAt))
        .limit(10);

      if (latestWithDict && !dictRuns.some(r => r.runId === latestWithDict.runId)) {
        dictRuns.push(latestWithDict);
      }

      let latestId = -1;
      for (const run of dictRuns) {
        if (run.dictionaryData && Array.isArray(run.dictionaryData) && (run.dictionaryData as unknown[]).length > 0) {
          const dict = dictionaryFromPairs(run.dictionaryData as Array<{ phrase: string; token: string }>, run.id);
          dictCache.set(run.runId, dict);
          if (run.id > latestId) {
            latestId = run.id;
            globalDictionary = dict;
          }
        }
      }

      if (globalDictionary.phraseToToken.size > 0) {
        logger.info({ dictVersionsCached: dictCache.size, dictSize: globalDictionary.phraseToToken.size }, "SemanticCompression: dictionary snapshots restored from DB");
      }
    } catch (dictErr) {
      logger.debug({ err: (dictErr as Error).message }, "SemanticCompression: dictionary restore error (non-fatal)");
    }

    logger.info({ loaded: rows.length }, "SemanticCompression: portal-jump table loaded from DB");
    return rows.length;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: portal-jump load error");
    return 0;
  }
}

// Auto-warm on module load: cross-run dedup and version-safe decoding active from request #1.
setImmediate(() => {
  loadPortalJumpTableFromDb().catch(err => {
    logger.debug({ err: (err as Error).message }, "SemanticCompression: startup hydration error (non-fatal)");
  });
});
