import OpenAI from "openai";
import { logger } from "./logger";
import { embeddingDimensionalCache } from "./dimensional-lru-cache";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "_DUMMY_API_KEY_";
    if (!baseURL) {
      throw new Error("AI_INTEGRATIONS_OPENAI_BASE_URL not set");
    }
    _client = new OpenAI({ baseURL, apiKey });
  }
  return _client;
}

const EMBEDDING_DIM = 256;
const MAX_BATCH_SIZE = 20;

let EMBEDDING_CACHE_TTL = 300_000;
let neuralPreference = 1.0;

export function setNeuralPreference(weight: number): void {
  neuralPreference = Math.max(0.1, Math.min(2.0, weight));
}

export function getNeuralPreference(): number {
  return neuralPreference;
}

export function setEmbeddingCacheTTL(ms: number): void {
  EMBEDDING_CACHE_TTL = Math.max(60_000, Math.min(600_000, ms));
}

const embeddingMetrics = {
  neuralCalls: 0,
  fallbackCalls: 0,
  cacheHits: 0,
  crossDimensionHits: 0,
  errors: 0,
};

function hashText(text: string): string {
  let h = 0;
  const t = text.slice(0, 500).toLowerCase().trim();
  for (let i = 0; i < t.length; i++) h = ((h << 5) - h + t.charCodeAt(i)) | 0;
  return `emb-${Math.abs(h).toString(36)}`;
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","of","to","in","on","at","by","for","with","as","is","are","was","were","be","been","being","have","has","had","do","does","did","this","that","these","those","it","its","from","so","not","no","yes","i","you","he","she","we","they","them","us","our","your","their","my","me"
]);

function hashStr(s: string, seed = 2166136261): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

function localFallbackEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  const bag = new Map<string, number>();
  const add = (t: string, w: number) => bag.set(t, (bag.get(t) ?? 0) + w);
  for (const t of tokens) add(t, 1);
  for (const g of ngrams(tokens, 2)) add(g, 0.6);
  for (const g of ngrams(tokens, 3)) add(g, 0.35);

  const simhash = new Array(EMBEDDING_DIM).fill(0);
  let totalWeight = 0;
  for (const [term, weight] of bag) {
    totalWeight += weight;
    const h1 = hashStr(term, 2166136261);
    const h2 = hashStr(term, 40503);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      const bit = ((h1 >>> (i % 32)) ^ (h2 >>> ((i * 7) % 32))) & 1;
      simhash[i] += bit ? weight : -weight;
    }
  }

  const vec = new Array(EMBEDDING_DIM).fill(0);
  const avgAbs = totalWeight > 0 ? totalWeight / EMBEDDING_DIM : 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] = Math.tanh(simhash[i] / (avgAbs * 4 + 1));
  }

  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag > 0) for (let i = 0; i < vec.length; i++) vec[i] /= mag;
  return vec;
}

export async function generateEmbedding(text: string, dimension: string = "general"): Promise<number[]> {
  const key = hashText(text);

  const cached = embeddingDimensionalCache.lookup(key, dimension);
  if (cached && Date.now() - cached.value.ts < EMBEDDING_CACHE_TTL) {
    embeddingMetrics.cacheHits++;
    if (cached.dimension !== dimension) embeddingMetrics.crossDimensionHits++;
    return cached.value.vec;
  }

  if (neuralPreference < 0.3) {
    embeddingMetrics.fallbackCalls++;
    const fallback = localFallbackEmbedding(text);
    embeddingDimensionalCache.set(key, { vec: fallback, ts: Date.now() }, dimension);
    return fallback;
  }

  const timeoutMs = Math.round(10_000 * Math.min(neuralPreference, 2.0));

  try {
    const client = getClient();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await client.embeddings.create(
      { model: "text-embedding-3-small", input: text.slice(0, 8000) },
      { signal: controller.signal as AbortSignal },
    );
    clearTimeout(timer);

    const vec = response.data[0]?.embedding;
    if (vec && vec.length > 0) {
      embeddingMetrics.neuralCalls++;
      embeddingDimensionalCache.set(key, { vec, ts: Date.now() }, dimension);
      return vec;
    }
  } catch (err) {
    embeddingMetrics.errors++;
    logger.debug({ err: (err as Error).message }, "NeuralEmbeddings: API call failed, using fallback");
  }

  embeddingMetrics.fallbackCalls++;
  const fallback = localFallbackEmbedding(text);
  embeddingDimensionalCache.set(key, { vec: fallback, ts: Date.now() }, dimension);
  return fallback;
}

export async function generateEmbeddingsBatch(texts: string[], dimension: string = "general"): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = new Array(texts.length);
  const uncachedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const key = hashText(texts[i]);
    const cached = embeddingDimensionalCache.lookup(key, dimension);
    if (cached && Date.now() - cached.value.ts < EMBEDDING_CACHE_TTL) {
      results[i] = cached.value.vec;
    } else {
      uncachedIndices.push(i);
    }
  }

  if (uncachedIndices.length === 0) return results;

  const batches: number[][] = [];
  for (let i = 0; i < uncachedIndices.length; i += MAX_BATCH_SIZE) {
    batches.push(uncachedIndices.slice(i, i + MAX_BATCH_SIZE));
  }

  for (const batch of batches) {
    const batchTexts = batch.map(idx => texts[idx].slice(0, 8000));
    let embeddings: number[][] | null = null;

    try {
      const client = getClient();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);

      const response = await client.embeddings.create(
        { model: "text-embedding-3-small", input: batchTexts },
        { signal: controller.signal as AbortSignal },
      );
      clearTimeout(timer);

      embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(d => d.embedding);
    } catch (err) {
      logger.debug({ err: (err as Error).message, batchSize: batch.length }, "NeuralEmbeddings: batch API call failed");
    }

    for (let j = 0; j < batch.length; j++) {
      const origIdx = batch[j];
      const vec = embeddings?.[j] ?? localFallbackEmbedding(texts[origIdx]);
      results[origIdx] = vec;
      embeddingDimensionalCache.set(hashText(texts[origIdx]), { vec, ts: Date.now() }, dimension);
    }
  }

  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function getEmbeddingStats() {
  const total = embeddingMetrics.neuralCalls + embeddingMetrics.fallbackCalls;
  const neuralRate = total > 0 ? Math.round((embeddingMetrics.neuralCalls / total) * 1000) / 1000 : 0;
  const healthy = total === 0 || neuralRate >= 0.5;
  const dimStats = embeddingDimensionalCache.getStats();
  const avoidedEmbeddingCalls = embeddingMetrics.cacheHits + embeddingMetrics.crossDimensionHits;
  const estimatedTimeSavedMs = avoidedEmbeddingCalls * 50;
  return {
    cacheSize: dimStats.totalSize,
    dimension: EMBEDDING_DIM,
    maxBatchSize: MAX_BATCH_SIZE,
    neuralCalls: embeddingMetrics.neuralCalls,
    fallbackCalls: embeddingMetrics.fallbackCalls,
    cacheHits: embeddingMetrics.cacheHits,
    crossDimensionHits: embeddingMetrics.crossDimensionHits,
    errors: embeddingMetrics.errors,
    neuralRate,
    mode: embeddingMetrics.neuralCalls > 0 ? "neural" : embeddingMetrics.fallbackCalls > 0 ? "fallback" : "idle",
    healthy,
    healthWarning: !healthy ? `Neural embedding rate ${(neuralRate * 100).toFixed(1)}% is below 50% threshold — semantic quality degraded` : null,
    dimensionalCache: dimStats,
    speedup: { avoidedEmbeddingCalls, estimatedTimeSavedMs },
  };
}
