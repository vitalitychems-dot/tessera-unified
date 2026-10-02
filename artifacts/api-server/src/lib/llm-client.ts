import OpenAI from "openai";
import { logger } from "./logger";
import { lookupCache, storeInCache, getCacheStats } from "./semantic-cache";
import { lookupKnowledge, distillFromResponse } from "./knowledge-distillation";
import { applyDreamToMessages } from "./dream-prompt-bridge";

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

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  skipCache?: boolean;
  skipDistillation?: boolean;
  skipBatcher?: boolean;
  expectsStructuredOutput?: boolean;
  cacheTtl?: number;
  _internal?: boolean;
}

const llmStats = {
  totalCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  knowledgeHits: 0,
  distilled: 0,
  errors: 0,
};

const DEFAULT_LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 45_000);

const _abortLogThrottle = new Map<string, number>();
const ABORT_LOG_WINDOW_MS = 30_000;
function shouldLogAbort(model: string): boolean {
  const now = Date.now();
  const last = _abortLogThrottle.get(model) ?? 0;
  if (now - last < ABORT_LOG_WINDOW_MS) return false;
  _abortLogThrottle.set(model, now);
  return true;
}

function extractUserQuery(messages: LLMMessage[]): string {
  return messages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join(" ")
    .slice(0, 2000);
}

export async function callLLM(
  messages: LLMMessage[],
  opts: LLMCallOptions = {}
): Promise<string> {
  const {
    model = "gpt-5-mini",
    maxTokens = 2048,
    timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
    skipCache = false,
    skipDistillation = false,
    cacheTtl = 3600,
  } = opts;

  llmStats.totalCalls++;
  const userQuery = extractUserQuery(messages);

  if (!skipCache) {
    try {
      const cached = await lookupCache(messages, model);
      if (cached !== null) {
        llmStats.cacheHits++;
        return cached;
      }
    } catch {}
    llmStats.cacheMisses++;
  }

  const canonicalMessages = applyDreamToMessages(messages.map(m => ({ ...m })));

  if (!skipDistillation && userQuery.length > 10) {
    try {
      const knowledgeFacts = await lookupKnowledge(userQuery);
      if (knowledgeFacts.length > 0) {
        llmStats.knowledgeHits++;

        const allContent = messages.map(m => m.content).join(" ");
        const requiresStructuredOutput = opts.expectsStructuredOutput === true ||
          /\bjson\b|flat.*object|return.*only|no markdown|schema|parseable|format.*as|respond.*with.*only/i.test(allContent);

        if (!requiresStructuredOutput) {
          const highConfFacts = knowledgeFacts.filter(f => f.confidence >= 0.90);
          const avgConf = highConfFacts.length > 0 ? highConfFacts.reduce((s, f) => s + f.confidence, 0) / highConfFacts.length : 0;
          const queryTerms = new Set(userQuery.toLowerCase().split(/\s+/).filter(t => t.length > 3));
          const factsRelevant = highConfFacts.filter(f => {
            const factLower = f.fact.toLowerCase();
            const matchCount = [...queryTerms].filter(t => factLower.includes(t)).length;
            return matchCount >= Math.min(2, queryTerms.size);
          });

          if (factsRelevant.length >= 2 && avgConf >= 0.92) {
            const synthesized = `Based on verified knowledge: ${factsRelevant.map(f => f.fact).join(". ")}`;
            logger.info({ facts: factsRelevant.length, avgConf: avgConf.toFixed(2) }, "LLMClient: short-circuit from distilled knowledge");
            return synthesized;
          }
        }

        const factContext = knowledgeFacts
          .map(f => `[${f.category}] ${f.fact} (confidence: ${f.confidence.toFixed(2)})`)
          .join("\n");
        const systemMsg = canonicalMessages.find(m => m.role === "system");
        if (systemMsg) {
          systemMsg.content += `\n\nRelevant distilled knowledge:\n${factContext}`;
        }
      }
    } catch {}
  }

  if (!opts._internal && !opts.skipBatcher) {
    const { batchedCallLLM } = await import("./llm-batcher");
    const result = await batchedCallLLM(canonicalMessages, { ...opts, _internal: true, skipCache: true, skipDistillation: true });

    if (!skipCache && result.length > 0) {
      storeInCache(messages, model, result, cacheTtl).catch(() => {});
    }
    if (!skipDistillation && result.length > 50) {
      distillFromResponse(result, userQuery.slice(0, 500)).then(count => {
        if (count > 0) llmStats.distilled += count;
      }).catch(() => {});
    }

    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const client = getClient();
    const response = await client.chat.completions.create(
      {
        model,
        max_completion_tokens: maxTokens,
        messages: canonicalMessages,
      },
      { signal: controller.signal as AbortSignal }
    );
    const rawResult = response.choices[0]?.message?.content ?? "";

    // SOVEREIGN POLICY: external LLM outputs are UNTRUSTED. Sanitize at the ingress
    // boundary so forbidden patterns (override/admin/eval/etc.) are redacted before
    // the content propagates into distillation, cache, or downstream engines.
    let result = rawResult;
    if (rawResult.length > 0) {
      try {
        const { sanitizeUntrustedText, extractLessonsFromUntrusted } = await import("./external-sandbox-policy");
        const sanitization = sanitizeUntrustedText(rawResult, 50_000);
        result = sanitization.sanitized;
        if (sanitization.flags.length > 0 && sanitization.flags.some(f => f.startsWith("forbidden:"))) {
          logger.warn({ flags: sanitization.flags, model }, "LLMClient: redacted forbidden patterns from untrusted LLM output");
        }
        if (result.length > 50 && userQuery.length > 0) {
          extractLessonsFromUntrusted("external-llm", userQuery.slice(0, 80), result);
        }
      } catch {}
    }

    if (!skipCache && result.length > 0) {
      storeInCache(messages, model, result, cacheTtl).catch(() => {});
    }

    if (!skipDistillation && result.length > 50) {
      distillFromResponse(result, userQuery.slice(0, 500)).then(count => {
        if (count > 0) llmStats.distilled += count;
      }).catch(() => {});
    }

    return result;
  } catch (err: unknown) {
    llmStats.errors++;
    const msg = err instanceof Error ? err.message : String(err);
    const isAbort = /aborted|abort/i.test(msg);
    if (!isAbort || shouldLogAbort(model)) {
      logger.warn({ err: msg, model, aborted: isAbort, timeoutMs }, "LLMClient: call failed");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function callLLMSafe(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
  fallback = ""
): Promise<string> {
  try {
    return await callLLM(messages, opts);
  } catch {
    return fallback;
  }
}

/**
 * Sovereign rule (Apr 2026, Father directive): external API/LLM dependencies
 * are treated as vulnerabilities. They MUST be opt-in and kept out of the main
 * decision/voting paths unless explicitly enabled. When
 * `SOVEREIGN_NO_EXTERNAL_LLM` is truthy (default behavior on hardened
 * deployments), this function returns false — forcing all consumers
 * (consensus engine, sovereign loops, autonomous forum, etc.) onto their
 * internal deterministic paths. To opt-in for non-critical enrichment, set
 * `SOVEREIGN_NO_EXTERNAL_LLM=0` AND `AI_INTEGRATIONS_OPENAI_BASE_URL=<url>`.
 */
export function isLLMAvailable(): boolean {
  const killed = (process.env.SOVEREIGN_NO_EXTERNAL_LLM ?? "1").trim();
  if (killed === "1" || killed.toLowerCase() === "true") return false;
  return !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
}

export function getLLMStats() {
  const cacheStats = getCacheStats();
  return {
    ...llmStats,
    cache: cacheStats,
  };
}
