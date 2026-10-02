import { logger } from "./logger";
import { searchMemory } from "./vector-memory";
import { recallIngestedKnowledge } from "./ingested-recall";
import { generateEmbedding, cosineSimilarity } from "./neural-embeddings";

export interface RetrievedChunk {
  text: string;
  source: string;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
  rerankScore?: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

function bm25Scores(query: string, docs: string[], k1 = 1.5, b = 0.75): number[] {
  const qTerms = Array.from(new Set(tokenize(query)));
  if (qTerms.length === 0 || docs.length === 0) return docs.map(() => 0);
  const tokenized = docs.map(tokenize);
  const lens = tokenized.map((d) => d.length);
  const avgdl = lens.reduce((a, b) => a + b, 0) / lens.length || 1;
  const N = docs.length;
  const df: Record<string, number> = {};
  for (const t of qTerms) {
    df[t] = tokenized.filter((d) => d.includes(t)).length;
  }
  const idf: Record<string, number> = {};
  for (const t of qTerms) {
    idf[t] = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
  }
  return tokenized.map((d, i) => {
    const counts: Record<string, number> = {};
    for (const w of d) counts[w] = (counts[w] || 0) + 1;
    let s = 0;
    for (const t of qTerms) {
      const f = counts[t] || 0;
      if (!f) continue;
      s += idf[t] * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * lens[i]) / avgdl)));
    }
    return s;
  });
}

function normalize(scores: number[]): number[] {
  const max = Math.max(...scores, 0.0001);
  return scores.map((s) => s / max);
}

export interface HybridRetrievalOpts {
  vectorWeight?: number;
  bm25Weight?: number;
  topK?: number;
  rerankTopK?: number;
}

export async function hybridRetrieve(query: string, opts: HybridRetrievalOpts = {}): Promise<RetrievedChunk[]> {
  const { vectorWeight = 0.6, bm25Weight = 0.4, topK = 8, rerankTopK = 5 } = opts;

  const candidates: RetrievedChunk[] = [];
  try {
    const vectorHits = await searchMemory(query, topK * 2);
    for (const hit of vectorHits as Array<Record<string, unknown>>) {
      const text = String(hit.content ?? hit.text ?? "");
      const source = String(hit.source ?? hit.id ?? "memory");
      const vScore = Number(hit.score ?? hit.similarity ?? 0);
      if (text) candidates.push({ text, source: `mem:${source}`, score: 0, vectorScore: vScore });
    }
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "hybrid: vector retrieval failed");
  }

  try {
    const ingested = await recallIngestedKnowledge(query, topK);
    for (const line of ingested) {
      candidates.push({ text: line, source: "ingested", score: 0, vectorScore: 0 });
    }
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "hybrid: ingested recall failed");
  }

  if (candidates.length === 0) return [];

  const docs = candidates.map((c) => c.text);
  const bm25 = bm25Scores(query, docs);
  const bm25N = normalize(bm25);
  const vecN = normalize(candidates.map((c) => c.vectorScore || 0));

  for (let i = 0; i < candidates.length; i++) {
    candidates[i].bm25Score = bm25[i];
    candidates[i].score = vectorWeight * vecN[i] + bm25Weight * bm25N[i];
  }

  candidates.sort((a, b) => b.score - a.score);
  const reranked = await rerankByEmbedding(query, candidates.slice(0, topK));
  return reranked.slice(0, rerankTopK);
}

async function rerankByEmbedding(query: string, chunks: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  try {
    const qEmb = await generateEmbedding(query);
    if (!qEmb || qEmb.length === 0) return chunks;
    const scored: RetrievedChunk[] = [];
    for (const c of chunks) {
      try {
        const cEmb = await generateEmbedding(c.text.slice(0, 800));
        const sim = cosineSimilarity(qEmb, cEmb);
        scored.push({ ...c, rerankScore: sim, score: 0.5 * c.score + 0.5 * sim });
      } catch {
        scored.push(c);
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "hybrid: rerank failed");
    return chunks;
  }
}

export function formatCitations(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[${i + 1}] ${c.source} (relevance: ${(c.score * 100).toFixed(0)}%)`)
    .join("\n");
}
