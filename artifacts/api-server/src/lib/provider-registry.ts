import { db } from "@workspace/db";
import { providerProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "./logger";

export interface ProviderConfig {
  id: string;
  name: string;
  isExternal: boolean;
  type: "cloud" | "local" | "proxy";
  models: string[];
  capabilities: string[];
  endpoint?: string;
  tier: 0 | 1 | 2;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest"],
    capabilities: ["chat", "reasoning", "coding", "analysis", "long-context"],
  },
  {
    id: "openai",
    name: "OpenAI",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["gpt-4o", "gpt-4.1", "gpt-4o-mini"],
    capabilities: ["chat", "coding", "function-calling", "vision", "embeddings"],
  },
  {
    id: "google",
    name: "Google",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["gemini-2.0-flash", "gemini-2.5-flash-preview-05-20"],
    capabilities: ["chat", "vision", "multimodal", "long-context", "reasoning"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["deepseek-chat", "deepseek-reasoner", "deepseek/deepseek-chimera"],
    capabilities: ["chat", "reasoning", "coding", "math"],
  },
  {
    id: "xai",
    name: "xAI",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["grok-3"],
    capabilities: ["chat", "real-time", "analysis"],
  },
  {
    id: "groq",
    name: "Groq",
    isExternal: true,
    type: "cloud",
    tier: 1,
    models: ["llama-3.3-70b-versatile"],
    capabilities: ["chat", "fast-inference", "open-weights"],
  },
  {
    id: "mistral",
    name: "Mistral",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["mistral-large-latest", "pixtral-large-latest", "codestral-latest"],
    capabilities: ["chat", "coding", "multilingual", "vision"],
  },
  {
    id: "meta",
    name: "Meta",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", "meta-llama/Meta-Llama-3.1-405B-Instruct"],
    capabilities: ["chat", "open-weights", "reasoning"],
  },
  {
    id: "qwen",
    name: "Qwen",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["qwen/qwen3-32b:free", "qwen/qwen3-235b-a22b"],
    capabilities: ["chat", "coding", "multilingual", "reasoning"],
  },
  {
    id: "moonshot",
    name: "Moonshot",
    isExternal: true,
    type: "cloud",
    tier: 2,
    models: ["moonshotai/kimi-k2", "moonshotai/kimi-k2.5", "moonshotai/kimi-k2-thinking"],
    capabilities: ["chat", "reasoning", "long-context"],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    isExternal: false,
    type: "local",
    tier: 0,
    endpoint: process.env.OLLAMA_ENDPOINT ?? "http://localhost:11434",
    models: [],
    capabilities: ["chat", "self-hosted", "offline", "privacy"],
  },
  {
    id: "puter",
    name: "Puter Proxy",
    isExternal: true,
    type: "proxy",
    tier: 2,
    models: ["via-puter"],
    capabilities: ["chat", "proxy", "multi-provider"],
  },
];

let providerStatuses = new Map<string, "active" | "degraded" | "offline">();

export function getProviderConfigs(): ProviderConfig[] {
  return PROVIDER_CONFIGS;
}

export function getProviderConfig(id: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS.find(p => p.id === id);
}

export function setProviderStatus(id: string, status: "active" | "degraded" | "offline"): void {
  providerStatuses.set(id, status);
}

export function getProviderStatus(id: string): "active" | "degraded" | "offline" {
  return providerStatuses.get(id) ?? "active";
}

export async function upsertProviderProfile(providerId: string, updates: Partial<{
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  capabilities: string[];
  strengths: string[];
  weaknesses: string[];
  capabilityScore: number;
  reliabilityScore: number;
  speedScore: number;
  lastAnalyzedAt: Date;
}>): Promise<void> {
  const config = getProviderConfig(providerId);
  if (!config) return;

  try {
    const existing = await db.select().from(providerProfilesTable)
      .where(eq(providerProfilesTable.providerId, providerId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(providerProfilesTable).values({
        providerId,
        providerName: config.name,
        isExternal: config.isExternal,
        isActive: true,
        models: config.models,
        capabilities: updates.capabilities ?? config.capabilities,
        strengths: updates.strengths ?? [],
        weaknesses: updates.weaknesses ?? [],
        ...updates,
        updatedAt: new Date(),
      });
    } else {
      await db.update(providerProfilesTable)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(providerProfilesTable.providerId, providerId));
    }
  } catch (err) {
    logger.error({ err, providerId }, "Failed to upsert provider profile");
  }
}

export async function getAllProviderProfiles() {
  try {
    return await db.select().from(providerProfilesTable);
  } catch {
    return [];
  }
}

export async function initializeProviderProfiles(): Promise<void> {
  for (const config of PROVIDER_CONFIGS) {
    await upsertProviderProfile(config.id, {
      capabilities: config.capabilities,
    });
  }
  logger.info({ count: PROVIDER_CONFIGS.length }, "Provider profiles initialized");
}

const INTERNAL_ONLY_PATHS = [
  "/api/sovereign-",
  "/api/mesh",
  "/api/swarm",
  "/api/council",
  "/api/self-heal",
  "/api/anomaly",
  "/api/recovery",
  "/api/file-integrity",
  "/api/diagnostics",
  "/api/ingestion",
  "/api/training",
];

const SOVEREIGN_TOKEN = process.env.SESSION_SECRET
  ? crypto.createHash("sha256").update(`sovereign:${process.env.SESSION_SECRET}`).digest("hex").slice(0, 32)
  : null;

function isRequestFromLocalhost(req: Request): boolean {
  const remoteAddr = req.socket?.remoteAddress || "";
  return remoteAddr === "127.0.0.1" || remoteAddr === "::1" || remoteAddr === "::ffff:127.0.0.1";
}

export function sovereigntyEnforcementMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path || req.url || "";

    const isInternalPath = INTERNAL_ONLY_PATHS.some(p => path.startsWith(p));

    if (isInternalPath) {
      const sovereignHeader = req.headers["x-sovereign-token"] as string | undefined;

      if (SOVEREIGN_TOKEN && sovereignHeader) {
        const headerBuf = Buffer.from(sovereignHeader);
        const tokenBuf = Buffer.from(SOVEREIGN_TOKEN);
        if (headerBuf.length === tokenBuf.length && crypto.timingSafeEqual(headerBuf, tokenBuf)) {
          next();
          return;
        }
        logger.warn({ path }, "Invalid sovereign token presented for internal endpoint");
        res.status(403).json({
          error: "Sovereignty violation: invalid sovereign token",
          code: "SOV-ENFORCE-002",
        });
        return;
      }

      if (SOVEREIGN_TOKEN && !sovereignHeader) {
        if (!isRequestFromLocalhost(req)) {
          logger.warn({ path, origin: req.headers.origin }, "Non-localhost request without sovereign token blocked");
          res.status(403).json({
            error: "Sovereignty violation: sovereign token required for internal endpoints",
            code: "SOV-ENFORCE-001",
          });
          return;
        }
      }

      if (!SOVEREIGN_TOKEN) {
        if (!isRequestFromLocalhost(req)) {
          logger.warn({ path }, "No SESSION_SECRET configured and non-localhost request — blocking internal endpoint");
          res.status(403).json({
            error: "Sovereignty violation: no sovereign token configured and non-localhost origin",
            code: "SOV-ENFORCE-003",
          });
          return;
        }
      }
    }

    next();
  };
}

export function isExternalProvider(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  return config?.isExternal ?? true;
}

export function getInternalProviders(): ProviderConfig[] {
  return PROVIDER_CONFIGS.filter(p => !p.isExternal);
}

export function getExternalProviders(): ProviderConfig[] {
  return PROVIDER_CONFIGS.filter(p => p.isExternal);
}
