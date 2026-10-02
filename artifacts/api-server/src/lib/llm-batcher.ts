import { callLLM, LLMMessage, LLMCallOptions } from "./llm-client";
import { logger } from "./logger";
import { generateEmbedding, cosineSimilarity } from "./neural-embeddings";
import * as crypto from "crypto";

interface QueuedRequest {
  messages: LLMMessage[];
  opts: LLMCallOptions;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
  hash: string;
  userContent: string;
  embedding: number[] | null;
  queuedAt: number;
}

interface RequestGroup {
  primary: QueuedRequest;
  duplicates: QueuedRequest[];
  semanticPeers: QueuedRequest[];
}

const BATCH_WINDOW_MS = 2000;
const MAX_BATCH_SIZE = 8;
const SEMANTIC_SIMILARITY_THRESHOLD = 0.85;

const queue: QueuedRequest[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

const batchStats = {
  totalBatched: 0,
  totalDeduplicated: 0,
  totalSemanticMerged: 0,
  totalFlushed: 0,
  batchesProcessed: 0,
};

function hashRequest(messages: LLMMessage[], model: string, opts: LLMCallOptions = {}): string {
  const key = messages.map(m => `${m.role}:${m.content}`).join("|") +
    `|model:${model}|maxTokens:${opts.maxTokens ?? 2048}|temp:${opts.temperature ?? 1}|structured:${opts.expectsStructuredOutput ?? false}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

function extractUserContent(messages: LLMMessage[]): string {
  return messages.filter(m => m.role === "user").map(m => m.content).join(" ").toLowerCase().trim();
}

function tokenJaccard(a: string, b: string): number {
  const tokensA = new Set(a.split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(b.split(/\s+/).filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  return intersection / (tokensA.size + tokensB.size - intersection);
}

function mergePrompts(primary: QueuedRequest, peers: QueuedRequest[]): LLMMessage[] {
  if (peers.length === 0) return primary.messages;

  const systemMsg = primary.messages.find(m => m.role === "system");
  const primaryUser = primary.messages.filter(m => m.role === "user").map(m => m.content).join("\n");
  const peerQueries = peers.map((p, i) =>
    p.messages.filter(m => m.role === "user").map(m => m.content).join("\n")
  );

  const mergedUserContent = `Answer each of the following related queries separately, labeling each response with [Q1], [Q2], etc:\n\n[Q1]: ${primaryUser}\n${peerQueries.map((q, i) => `[Q${i + 2}]: ${q}`).join("\n")}`;

  const merged: LLMMessage[] = [];
  if (systemMsg) merged.push(systemMsg);
  merged.push({ role: "user", content: mergedUserContent });
  return merged;
}

function splitMergedResponse(response: string, count: number): string[] {
  const parts: string[] = [];
  for (let i = 1; i <= count; i++) {
    const label = `[Q${i}]`;
    const nextLabel = `[Q${i + 1}]`;
    const start = response.indexOf(label);
    if (start === -1) {
      parts.push(response);
      continue;
    }
    const contentStart = start + label.length;
    const end = i < count ? response.indexOf(nextLabel) : -1;
    const segment = end > contentStart
      ? response.slice(contentStart, end).trim()
      : response.slice(contentStart).trim();
    parts.push(segment.replace(/^[:\s]+/, ""));
  }

  while (parts.length < count) parts.push(response);
  return parts;
}

function extractSystemPrompt(messages: LLMMessage[]): string {
  return messages.filter(m => m.role === "system").map(m => m.content).join("|");
}

function requiresStructuredOutput(req: QueuedRequest): boolean {
  if (req.opts.expectsStructuredOutput === true) return true;
  const allContent = req.messages.map(m => m.content).join(" ");
  return /\bjson\b|flat.*object|return.*only|no markdown|schema|parseable/i.test(allContent);
}

function areRequestsMergeable(a: QueuedRequest, b: QueuedRequest): boolean {
  const modelA = a.opts.model ?? "gpt-5-mini";
  const modelB = b.opts.model ?? "gpt-5-mini";
  if (modelA !== modelB) return false;

  if (requiresStructuredOutput(a) || requiresStructuredOutput(b)) return false;

  if (a.messages.length !== b.messages.length) return false;

  if (a.messages.length > 2 || b.messages.length > 2) return false;

  const sysA = extractSystemPrompt(a.messages);
  const sysB = extractSystemPrompt(b.messages);
  if (sysA !== sysB) return false;

  const assistantA = a.messages.filter(m => m.role === "assistant").map(m => m.content).join("|");
  const assistantB = b.messages.filter(m => m.role === "assistant").map(m => m.content).join("|");
  if (assistantA !== assistantB) return false;

  const maxTokensA = a.opts.maxTokens ?? 1024;
  const maxTokensB = b.opts.maxTokens ?? 1024;
  if (Math.abs(maxTokensA - maxTokensB) > maxTokensA * 0.5) return false;

  return true;
}

function groupRequests(batch: QueuedRequest[]): RequestGroup[] {
  const groups: RequestGroup[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < batch.length; i++) {
    if (assigned.has(i)) continue;

    const group: RequestGroup = {
      primary: batch[i],
      duplicates: [],
      semanticPeers: [],
    };
    assigned.add(i);

    for (let j = i + 1; j < batch.length; j++) {
      if (assigned.has(j)) continue;

      if (batch[j].hash === batch[i].hash) {
        group.duplicates.push(batch[j]);
        assigned.add(j);
        batchStats.totalDeduplicated++;
        continue;
      }

      if (
        batch[i].userContent.length > 0 &&
        batch[j].userContent.length > 0 &&
        areRequestsMergeable(batch[i], batch[j])
      ) {
        let similarity = 0;
        if (batch[i].embedding && batch[j].embedding) {
          similarity = cosineSimilarity(batch[i].embedding!, batch[j].embedding!);
        } else {
          similarity = tokenJaccard(batch[i].userContent, batch[j].userContent);
        }
        if (similarity >= SEMANTIC_SIMILARITY_THRESHOLD) {
          group.semanticPeers.push(batch[j]);
          assigned.add(j);
          batchStats.totalSemanticMerged++;
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

async function executeGroup(group: RequestGroup): Promise<void> {
  const { primary, duplicates, semanticPeers } = group;

  if (semanticPeers.length === 0) {
    const result = await callLLM(primary.messages, { ...primary.opts, _internal: true });
    primary.resolve(result);
    for (const dup of duplicates) dup.resolve(result);
    return;
  }

  const mergedMessages = mergePrompts(primary, semanticPeers);
  const totalQueries = 1 + semanticPeers.length;
  const mergedOpts = { ...primary.opts, maxTokens: (primary.opts.maxTokens ?? 1024) * totalQueries };

  const mergedResponse = await callLLM(mergedMessages, { ...mergedOpts, _internal: true });
  const parts = splitMergedResponse(mergedResponse, totalQueries);

  const allLabelsPresent = Array.from({ length: totalQueries }, (_, i) => `[Q${i + 1}]`).every(label => mergedResponse.includes(label));
  if (allLabelsPresent) {
    primary.resolve(parts[0]);
    for (const dup of duplicates) dup.resolve(parts[0]);
    for (let i = 0; i < semanticPeers.length; i++) {
      semanticPeers[i].resolve(parts[i + 1] ?? mergedResponse);
    }
    logger.info({ totalQueries, peers: semanticPeers.length }, "LLMBatcher: semantic merge executed");
  } else {
    logger.warn({ totalQueries }, "LLMBatcher: merged response missing labels, falling back to individual calls");
    const primaryResult = await callLLM(primary.messages, { ...primary.opts, _internal: true });
    primary.resolve(primaryResult);
    for (const dup of duplicates) {
      dup.resolve(primaryResult);
    }
    const peerPromises = semanticPeers.map(async (peer) => {
      const result = await callLLM(peer.messages, { ...peer.opts, _internal: true });
      peer.resolve(result);
    });
    await Promise.allSettled(peerPromises);
  }
}

async function flushBatch(): Promise<void> {
  batchTimer = null;
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH_SIZE);
  batchStats.batchesProcessed++;
  batchStats.totalFlushed += batch.length;

  const groups = groupRequests(batch);

  const promises: Promise<void>[] = [];
  for (const group of groups) {
    promises.push(
      executeGroup(group).catch(err => {
        group.primary.reject(err);
        for (const d of group.duplicates) d.reject(err);
        for (const p of group.semanticPeers) p.reject(err);
      }),
    );
  }

  await Promise.allSettled(promises);

  if (queue.length > 0) {
    scheduleBatch();
  }
}

function scheduleBatch(): void {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    flushBatch().catch(err => {
      logger.warn({ err: (err as Error).message }, "LLMBatcher: flush error");
    });
  }, BATCH_WINDOW_MS);
}

export function batchedCallLLM(messages: LLMMessage[], opts: LLMCallOptions = {}): Promise<string> {
  batchStats.totalBatched++;
  const model = opts.model ?? "gpt-5-mini";
  const hash = hashRequest(messages, model, opts);
  const userContent = extractUserContent(messages);

  return new Promise<string>((resolve, reject) => {
    const req: QueuedRequest = { messages, opts, resolve, reject, hash, userContent, embedding: null, queuedAt: Date.now() };
    generateEmbedding(userContent).then(emb => { req.embedding = emb; }).catch(() => {});
    queue.push(req);

    if (queue.length >= MAX_BATCH_SIZE) {
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
      flushBatch().catch(err => {
        logger.warn({ err: (err as Error).message }, "LLMBatcher: immediate flush error");
      });
    } else {
      scheduleBatch();
    }
  });
}

export async function batchedCallLLMSafe(messages: LLMMessage[], opts: LLMCallOptions = {}, fallback = ""): Promise<string> {
  try {
    return await batchedCallLLM(messages, opts);
  } catch {
    return fallback;
  }
}

export function getBatcherStats() {
  const callsSaved = batchStats.totalDeduplicated + batchStats.totalSemanticMerged;
  const reductionRate = batchStats.totalBatched > 0 ? callsSaved / batchStats.totalBatched : 0;
  return {
    ...batchStats,
    callsSaved,
    reductionRate: Math.round(reductionRate * 1000) / 1000,
    queueLength: queue.length,
    batchWindowMs: BATCH_WINDOW_MS,
    maxBatchSize: MAX_BATCH_SIZE,
    semanticThreshold: SEMANTIC_SIMILARITY_THRESHOLD,
  };
}
