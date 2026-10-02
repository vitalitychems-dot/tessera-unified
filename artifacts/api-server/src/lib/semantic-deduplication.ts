import { db } from "@workspace/db";
import { vectorEmbeddingsTable, distilledKnowledgeTable, systemStateTable, ingestedDataTable } from "@workspace/db/schema";
import { eq, sql, desc, gt } from "drizzle-orm";
import { generateEmbedding, generateEmbeddingsBatch, cosineSimilarity } from "./neural-embeddings";
import { logger } from "./logger";

const SIMILARITY_THRESHOLD = 0.92;
const SCAN_BATCH_SIZE = 100;
const REDIRECT_STATE_KEY = "dedup.redirectMap";

interface DuplicateCluster {
  canonicalId: number;
  duplicateIds: number[];
  similarity: number;
  table: "vector_embeddings" | "distilled_knowledge";
}

interface MergeResult {
  canonicalId: number;
  mergedIds: number[];
  contentPreview: string;
}

const redirectMap = new Map<string, number>();

const dedupStats = {
  totalScans: 0,
  duplicatesFound: 0,
  entriesMerged: 0,
  storageSaved: 0,
  lastScanAt: 0,
  lastScanDurationMs: 0,
  vectorDuplicates: 0,
  knowledgeDuplicates: 0,
  ingestDeduped: 0,
  ingestMerged: 0,
  mergeQuality: {
    totalSimilaritySum: 0,
    totalClusters: 0,
    contentExpansions: 0,
    totalMergeEvents: 0,
  },
};

function makeRedirectKey(table: string, id: number): string {
  return `${table}:${id}`;
}

export function resolveCanonicalId(table: string, id: number): number {
  let resolved = id;
  const visited = new Set<string>();
  while (true) {
    const key = makeRedirectKey(table, resolved);
    if (visited.has(key)) break;
    visited.add(key);
    const next = redirectMap.get(key);
    if (next === undefined || next === resolved) break;
    resolved = next;
  }
  return resolved;
}

async function persistRedirectMap(): Promise<void> {
  try {
    const entries: Array<[string, number]> = [...redirectMap.entries()];
    await db.insert(systemStateTable).values({
      key: REDIRECT_STATE_KEY,
      value: entries,
      description: "Semantic deduplication redirect map (merged → canonical)",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: entries, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticDedup: failed to persist redirect map");
  }
}

export async function loadRedirectMap(): Promise<number> {
  try {
    const [row] = await db
      .select()
      .from(systemStateTable)
      .where(eq(systemStateTable.key, REDIRECT_STATE_KEY))
      .limit(1);
    if (row && Array.isArray(row.value)) {
      const entries = row.value as Array<[string, number]>;
      for (const [key, canonicalId] of entries) {
        redirectMap.set(key, canonicalId);
      }
      return entries.length;
    }
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticDedup: failed to load redirect map");
  }
  return 0;
}

async function loadAllVectorEmbeddings(): Promise<Array<{
  id: number;
  content: string;
  embedding: number[];
  accessCount: number;
  source: string;
}>> {
  const all: Array<{ id: number; content: string; embedding: number[]; accessCount: number; source: string }> = [];
  let lastId = 0;

  while (true) {
    const batch = await db
      .select({
        id: vectorEmbeddingsTable.id,
        content: vectorEmbeddingsTable.content,
        embedding: vectorEmbeddingsTable.embedding,
        accessCount: vectorEmbeddingsTable.accessCount,
        source: vectorEmbeddingsTable.source,
      })
      .from(vectorEmbeddingsTable)
      .where(gt(vectorEmbeddingsTable.id, lastId))
      .orderBy(vectorEmbeddingsTable.id)
      .limit(SCAN_BATCH_SIZE);

    if (batch.length === 0) break;

    for (const row of batch) {
      const emb = row.embedding as number[];
      if (Array.isArray(emb) && emb.length > 0) {
        all.push({ ...row, embedding: emb });
      }
    }
    lastId = batch[batch.length - 1].id;
  }

  return all;
}

async function loadAllDistilledKnowledge(): Promise<Array<{
  id: number;
  fact: string;
  confidence: number;
  accessCount: number;
  category: string;
  embedding: number[];
}>> {
  const all: Array<{ id: number; fact: string; confidence: number; accessCount: number; category: string }> = [];
  type RawRow = { id: number; fact: string | null; confidence: number; accessCount: number; category: string };
  const pushNonNull = (rows: RawRow[]) => {
    for (const r of rows) if (r.fact != null) all.push({ ...r, fact: r.fact });
  };
  let lastId = 0;

  while (true) {
    const batch = await db
      .select({
        id: distilledKnowledgeTable.id,
        fact: distilledKnowledgeTable.fact,
        confidence: distilledKnowledgeTable.confidence,
        accessCount: distilledKnowledgeTable.accessCount,
        category: distilledKnowledgeTable.category,
      })
      .from(distilledKnowledgeTable)
      .where(gt(distilledKnowledgeTable.id, lastId))
      .orderBy(distilledKnowledgeTable.id)
      .limit(SCAN_BATCH_SIZE);

    if (batch.length === 0) break;
    pushNonNull(batch);
    lastId = batch[batch.length - 1].id;
  }

  const texts = all.map(r => r.fact);
  const embeddings = await generateEmbeddingsBatch(texts);

  return all.map((row, i) => ({
    ...row,
    embedding: embeddings[i] ?? [],
  }));
}

class UnionFind {
  private parent: Map<number, number> = new Map();
  private rank: Map<number, number> = new Map();

  find(x: number): number {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let curr = x;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }

  getGroups(): Map<number, number[]> {
    const groups = new Map<number, number[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(id);
    }
    return groups;
  }
}

function findDuplicateClusters<T extends { id: number; embedding: number[] }>(
  rows: T[],
  table: "vector_embeddings" | "distilled_knowledge",
): DuplicateCluster[] {
  const uf = new UnionFind();
  const bestSims = new Map<number, number>();

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].embedding.length === 0) continue;
    uf.find(rows[i].id);

    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].embedding.length === 0) continue;

      const sim = cosineSimilarity(rows[i].embedding, rows[j].embedding);
      if (sim >= SIMILARITY_THRESHOLD) {
        uf.union(rows[i].id, rows[j].id);
        const rootA = uf.find(rows[i].id);
        bestSims.set(rootA, Math.max(bestSims.get(rootA) ?? 0, sim));
      }
    }
  }

  const groups = uf.getGroups();
  const clusters: DuplicateCluster[] = [];

  for (const [root, members] of groups) {
    if (members.length < 2) continue;

    const canonicalId = members[0];
    const duplicateIds = members.slice(1);
    clusters.push({
      canonicalId,
      duplicateIds,
      similarity: bestSims.get(root) ?? SIMILARITY_THRESHOLD,
      table,
    });
  }

  return clusters;
}

async function mergeVectorCluster(cluster: DuplicateCluster): Promise<MergeResult> {
  const allIds = [cluster.canonicalId, ...cluster.duplicateIds];

  const rows = await db
    .select()
    .from(vectorEmbeddingsTable)
    .where(sql`${vectorEmbeddingsTable.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(vectorEmbeddingsTable.accessCount));

  if (rows.length === 0) {
    return { canonicalId: cluster.canonicalId, mergedIds: [], contentPreview: "" };
  }

  const canonical = rows[0];
  const duplicateRows = rows.filter(r => r.id !== canonical.id);
  const longestContent = rows.reduce((a, b) => a.content.length >= b.content.length ? a : b);
  const totalAccess = rows.reduce((sum, r) => sum + r.accessCount, 0);

  const mergedMetadata: Record<string, unknown> = {};
  const sources = new Set<string>();
  for (const row of rows) {
    sources.add(row.source);
    if (row.metadata && typeof row.metadata === "object") {
      Object.assign(mergedMetadata, row.metadata);
    }
  }
  mergedMetadata.mergedFrom = duplicateRows.map(r => r.id);
  mergedMetadata.mergedSources = [...sources];
  mergedMetadata.mergedAt = Date.now();

  const bestContent = longestContent.content;
  const contentChanged = bestContent !== canonical.content;

  let newEmbedding: number[] | undefined;
  if (contentChanged) {
    newEmbedding = await generateEmbedding(bestContent);
  }

  let storageSaved = 0;
  await db.transaction(async (tx) => {
    const updateSet: Record<string, unknown> = {
      content: bestContent,
      accessCount: totalAccess,
      metadata: mergedMetadata,
      updatedAt: new Date(),
    };
    if (newEmbedding) {
      updateSet.embedding = newEmbedding;
    }

    await tx
      .update(vectorEmbeddingsTable)
      .set(updateSet)
      .where(eq(vectorEmbeddingsTable.id, canonical.id));

    for (const dup of duplicateRows) {
      storageSaved += dup.content.length;

      await tx
        .update(ingestedDataTable)
        .set({ embeddingId: canonical.id })
        .where(eq(ingestedDataTable.embeddingId, dup.id));

      await tx
        .delete(vectorEmbeddingsTable)
        .where(eq(vectorEmbeddingsTable.id, dup.id));
    }
  });

  for (const dup of duplicateRows) {
    redirectMap.set(makeRedirectKey("vector_embeddings", dup.id), canonical.id);
  }

  dedupStats.storageSaved += storageSaved;
  dedupStats.vectorDuplicates += duplicateRows.length;
  dedupStats.mergeQuality.totalSimilaritySum += cluster.similarity;
  dedupStats.mergeQuality.totalClusters++;
  dedupStats.mergeQuality.totalMergeEvents += duplicateRows.length;
  if (contentChanged) dedupStats.mergeQuality.contentExpansions++;

  return {
    canonicalId: canonical.id,
    mergedIds: duplicateRows.map(r => r.id),
    contentPreview: bestContent.slice(0, 100),
  };
}

async function mergeKnowledgeCluster(cluster: DuplicateCluster): Promise<MergeResult> {
  const allIds = [cluster.canonicalId, ...cluster.duplicateIds];

  const rawRows = await db
    .select()
    .from(distilledKnowledgeTable)
    .where(sql`${distilledKnowledgeTable.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(distilledKnowledgeTable.confidence));

  const rows = rawRows
    .filter((r): r is typeof r & { fact: string } => r.fact != null);

  if (rows.length === 0) {
    return { canonicalId: cluster.canonicalId, mergedIds: [], contentPreview: "" };
  }

  const canonical = rows[0];
  const duplicateRows = rows.filter(r => r.id !== canonical.id);
  const longestFact = rows.reduce((a, b) => a.fact.length >= b.fact.length ? a : b);
  const maxConfidence = Math.max(...rows.map(r => r.confidence));
  const totalAccess = rows.reduce((sum, r) => sum + r.accessCount, 0);
  const anyVerified = rows.some(r => r.verified);

  let storageSaved = 0;
  await db.transaction(async (tx) => {
    await tx
      .update(distilledKnowledgeTable)
      .set({
        fact: longestFact.fact,
        confidence: maxConfidence,
        accessCount: totalAccess,
        verified: anyVerified,
        updatedAt: new Date(),
      })
      .where(eq(distilledKnowledgeTable.id, canonical.id));

    for (const dup of duplicateRows) {
      storageSaved += dup.fact.length;

      await tx
        .delete(distilledKnowledgeTable)
        .where(eq(distilledKnowledgeTable.id, dup.id));
    }
  });

  for (const dup of duplicateRows) {
    redirectMap.set(makeRedirectKey("distilled_knowledge", dup.id), canonical.id);
  }

  dedupStats.storageSaved += storageSaved;
  dedupStats.knowledgeDuplicates += duplicateRows.length;
  dedupStats.mergeQuality.totalSimilaritySum += cluster.similarity;
  dedupStats.mergeQuality.totalClusters++;
  dedupStats.mergeQuality.totalMergeEvents += duplicateRows.length;
  if (longestFact.id !== canonical.id) dedupStats.mergeQuality.contentExpansions++;

  return {
    canonicalId: canonical.id,
    mergedIds: duplicateRows.map(r => r.id),
    contentPreview: longestFact.fact.slice(0, 100),
  };
}

export async function runDeduplicationScan(): Promise<{
  vectorClusters: number;
  knowledgeClusters: number;
  totalMerged: number;
  storageSaved: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  dedupStats.totalScans++;
  dedupStats.lastScanAt = startTime;

  let totalMerged = 0;
  let vectorClusters = 0;
  let knowledgeClusters = 0;

  const vectorRows = await loadAllVectorEmbeddings();
  const vectorDupClusters = findDuplicateClusters(vectorRows, "vector_embeddings");

  for (const cluster of vectorDupClusters) {
    const result = await mergeVectorCluster(cluster);
    totalMerged += result.mergedIds.length;
    vectorClusters++;
    logger.info({
      canonicalId: result.canonicalId,
      merged: result.mergedIds.length,
      preview: result.contentPreview,
    }, "SemanticDedup: merged vector embedding cluster");
  }

  const knowledgeRows = await loadAllDistilledKnowledge();
  const knowledgeDupClusters = findDuplicateClusters(knowledgeRows, "distilled_knowledge");

  for (const cluster of knowledgeDupClusters) {
    const result = await mergeKnowledgeCluster(cluster);
    totalMerged += result.mergedIds.length;
    knowledgeClusters++;
    logger.info({
      canonicalId: result.canonicalId,
      merged: result.mergedIds.length,
      preview: result.contentPreview,
    }, "SemanticDedup: merged knowledge cluster");
  }

  dedupStats.entriesMerged += totalMerged;
  dedupStats.duplicatesFound += totalMerged;

  if (totalMerged > 0) {
    await persistRedirectMap();
  }

  const durationMs = Date.now() - startTime;
  dedupStats.lastScanDurationMs = durationMs;

  logger.info({
    vectorClusters,
    knowledgeClusters,
    totalMerged,
    storageSaved: dedupStats.storageSaved,
    durationMs,
  }, "SemanticDedup: full scan complete");

  return {
    vectorClusters,
    knowledgeClusters,
    totalMerged,
    storageSaved: dedupStats.storageSaved,
    durationMs,
  };
}

export async function checkDuplicateBeforeIngest(
  content: string,
  table: "vector_embeddings" | "distilled_knowledge" = "vector_embeddings",
  ingestSource?: string,
  ingestMeta?: Record<string, unknown>,
): Promise<{
  isDuplicate: boolean;
  canonicalId?: number;
  similarity?: number;
  action?: "merged" | "skipped";
}> {
  try {
    const newEmbedding = await generateEmbedding(content);

    if (table === "vector_embeddings") {
      let lastId = 0;
      while (true) {
        const rows = await db
          .select({
            id: vectorEmbeddingsTable.id,
            content: vectorEmbeddingsTable.content,
            embedding: vectorEmbeddingsTable.embedding,
            accessCount: vectorEmbeddingsTable.accessCount,
            source: vectorEmbeddingsTable.source,
            metadata: vectorEmbeddingsTable.metadata,
          })
          .from(vectorEmbeddingsTable)
          .where(gt(vectorEmbeddingsTable.id, lastId))
          .orderBy(vectorEmbeddingsTable.id)
          .limit(SCAN_BATCH_SIZE);

        if (rows.length === 0) break;
        lastId = rows[rows.length - 1].id;

        for (const row of rows) {
          const emb = row.embedding as number[];
          if (!Array.isArray(emb) || emb.length === 0) continue;

          const sim = cosineSimilarity(newEmbedding, emb);
          if (sim >= SIMILARITY_THRESHOLD) {
            const contentChanged = content.length > row.content.length;
            const bestContent = contentChanged ? content : row.content;

            const mergedMeta: Record<string, unknown> = {
              ...((row.metadata ?? {}) as Record<string, unknown>),
              ...(ingestMeta ?? {}),
              lastMergedAt: Date.now(),
            };

            if (ingestSource) {
              const existingSources = new Set<string>();
              existingSources.add(row.source);
              existingSources.add(ingestSource);
              mergedMeta.mergedSources = [...existingSources];
            }

            const updates: Record<string, unknown> = {
              content: bestContent,
              accessCount: sql`${vectorEmbeddingsTable.accessCount} + 1`,
              metadata: mergedMeta,
              updatedAt: new Date(),
            };

            if (contentChanged) {
              updates.embedding = await generateEmbedding(bestContent);
            }

            await db
              .update(vectorEmbeddingsTable)
              .set(updates)
              .where(eq(vectorEmbeddingsTable.id, row.id));

            dedupStats.ingestDeduped++;
            dedupStats.ingestMerged++;
            return { isDuplicate: true, canonicalId: row.id, similarity: sim, action: "merged" };
          }
        }
      }
    } else {
      let lastId = 0;
      while (true) {
        const rawScanRows = await db
          .select({
            id: distilledKnowledgeTable.id,
            fact: distilledKnowledgeTable.fact,
            confidence: distilledKnowledgeTable.confidence,
          })
          .from(distilledKnowledgeTable)
          .where(gt(distilledKnowledgeTable.id, lastId))
          .orderBy(distilledKnowledgeTable.id)
          .limit(SCAN_BATCH_SIZE);

        if (rawScanRows.length === 0) break;
        lastId = rawScanRows[rawScanRows.length - 1].id;
        const rows = rawScanRows.filter((r): r is typeof r & { fact: string } => r.fact != null);
        if (rows.length === 0) continue;

        const texts: string[] = rows.map(r => r.fact);
        const embeddings = await generateEmbeddingsBatch(texts);

        for (let i = 0; i < rows.length; i++) {
          if (!embeddings[i] || embeddings[i].length === 0) continue;
          const sim = cosineSimilarity(newEmbedding, embeddings[i]);
          if (sim >= SIMILARITY_THRESHOLD) {
            const bestFact = content.length > rows[i].fact.length ? content : rows[i].fact;
            await db
              .update(distilledKnowledgeTable)
              .set({
                fact: bestFact,
                accessCount: sql`${distilledKnowledgeTable.accessCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(distilledKnowledgeTable.id, rows[i].id));

            dedupStats.ingestDeduped++;
            dedupStats.ingestMerged++;
            return { isDuplicate: true, canonicalId: rows[i].id, similarity: sim, action: "merged" };
          }
        }
      }
    }
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "SemanticDedup: pre-ingest check failed");
  }

  return { isDuplicate: false };
}

export function getDeduplicationStats() {
  const mq = dedupStats.mergeQuality;
  return {
    ...dedupStats,
    redirectMapSize: redirectMap.size,
    deduplicationRate: dedupStats.totalScans > 0
      ? dedupStats.duplicatesFound / Math.max(dedupStats.totalScans, 1)
      : 0,
    mergeQuality: {
      ...mq,
      avgSimilarity: mq.totalClusters > 0 ? mq.totalSimilaritySum / mq.totalClusters : 0,
      contentExpansionRate: mq.totalClusters > 0 ? mq.contentExpansions / mq.totalClusters : 0,
    },
  };
}

export async function runDeduplicationMigration(): Promise<{
  status: "completed" | "failed";
  vectorClusters: number;
  knowledgeClusters: number;
  totalMerged: number;
  storageSaved: number;
  durationMs: number;
  embeddingIdRemaps: number;
  error?: string;
}> {
  const start = Date.now();
  let embeddingIdRemaps = 0;

  try {
    const preVectorCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(vectorEmbeddingsTable);
    const preKnowledgeCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(distilledKnowledgeTable);

    logger.info({
      vectorEntries: preVectorCount[0]?.cnt ?? 0,
      knowledgeEntries: preKnowledgeCount[0]?.cnt ?? 0,
    }, "SemanticDedup Migration: starting one-time deduplication");

    const result = await runDeduplicationScan();

    embeddingIdRemaps = redirectMap.size;

    const postVectorCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(vectorEmbeddingsTable);
    const postKnowledgeCount = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(distilledKnowledgeTable);

    logger.info({
      preVector: preVectorCount[0]?.cnt ?? 0,
      postVector: postVectorCount[0]?.cnt ?? 0,
      preKnowledge: preKnowledgeCount[0]?.cnt ?? 0,
      postKnowledge: postKnowledgeCount[0]?.cnt ?? 0,
      merged: result.totalMerged,
      embeddingIdRemaps,
    }, "SemanticDedup Migration: complete");

    return {
      status: "completed",
      ...result,
      embeddingIdRemaps,
    };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error({ err: msg }, "SemanticDedup Migration: failed");
    return {
      status: "failed",
      vectorClusters: 0,
      knowledgeClusters: 0,
      totalMerged: 0,
      storageSaved: 0,
      durationMs: Date.now() - start,
      embeddingIdRemaps,
      error: msg,
    };
  }
}

export function resetDeduplicationStats(): void {
  dedupStats.totalScans = 0;
  dedupStats.duplicatesFound = 0;
  dedupStats.entriesMerged = 0;
  dedupStats.storageSaved = 0;
  dedupStats.lastScanAt = 0;
  dedupStats.lastScanDurationMs = 0;
  dedupStats.vectorDuplicates = 0;
  dedupStats.knowledgeDuplicates = 0;
  dedupStats.ingestDeduped = 0;
  dedupStats.ingestMerged = 0;
  redirectMap.clear();
}
