import { logger } from "./logger";

export type LocalAdapterType = "ollama" | "llama-cpp" | "vllm" | "lm-studio" | "tgi";

export interface LocalModelCapabilities {
  chat: boolean;
  completion: boolean;
  embeddings: boolean;
  vision: boolean;
  codeGen: boolean;
  maxContextTokens: number;
}

export interface LocalModelInfo {
  id: string;
  name: string;
  adapter: LocalAdapterType;
  endpoint: string;
  models: string[];
  capabilities: LocalModelCapabilities;
  isAvailable: boolean;
  latencyMs: number | null;
  lastCheckedAt: Date | null;
  errorMessage?: string;
}

export interface LocalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LocalChatResult {
  text: string;
  model: string;
  latencyMs: number;
  tokenCount?: number;
  adapter: LocalAdapterType;
}

export interface LocalAdapter {
  type: LocalAdapterType;
  endpoint: string;
  healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }>;
  chat(model: string, messages: LocalChatMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<LocalChatResult>;
  listModels(): Promise<string[]>;
}

class OllamaAdapter implements LocalAdapter {
  type: LocalAdapterType = "ollama";
  endpoint: string;

  constructor(endpoint = "http://localhost:11434") {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.endpoint}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (!resp.ok) return { ok: false, models: [], latencyMs };
      const data = await resp.json() as { models?: Array<{ name: string }> };
      const models = (data.models ?? []).map((m) => m.name);
      return { ok: true, models, latencyMs };
    } catch {
      return { ok: false, models: [], latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const resp = await fetch(`${this.endpoint}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return [];
      const data = await resp.json() as { models?: Array<{ name: string }> };
      return (data.models ?? []).map((m) => m.name);
    } catch {
      return [];
    }
  }

  async chat(
    model: string,
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LocalChatResult> {
    const start = Date.now();
    const resp = await fetch(`${this.endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          num_predict: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.7,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      throw new Error(`Ollama chat failed: ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json() as {
      message?: { content: string };
      eval_count?: number;
    };
    return {
      text: data.message?.content ?? "",
      model,
      latencyMs: Date.now() - start,
      tokenCount: data.eval_count,
      adapter: "ollama",
    };
  }
}

class LlamaCppAdapter implements LocalAdapter {
  type: LocalAdapterType = "llama-cpp";
  endpoint: string;

  constructor(endpoint = "http://localhost:8080") {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.endpoint}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return { ok: resp.ok, models: ["llama-cpp-default"], latencyMs: Date.now() - start };
    } catch {
      return { ok: false, models: [], latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<string[]> {
    return ["llama-cpp-default"];
  }

  async chat(
    model: string,
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LocalChatResult> {
    const start = Date.now();
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";
    const resp = await fetch(`${this.endpoint}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        n_predict: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.7,
        stop: ["\nuser:", "\nhuman:"],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) throw new Error(`llama.cpp chat failed: ${resp.status}`);
    const data = await resp.json() as { content?: string; tokens_predicted?: number };
    return {
      text: data.content ?? "",
      model,
      latencyMs: Date.now() - start,
      tokenCount: data.tokens_predicted,
      adapter: "llama-cpp",
    };
  }
}

class VllmAdapter implements LocalAdapter {
  type: LocalAdapterType = "vllm";
  endpoint: string;

  constructor(endpoint = "http://localhost:8000") {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.endpoint}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return { ok: false, models: [], latencyMs: Date.now() - start };
      const data = await resp.json() as { data?: Array<{ id: string }> };
      const models = (data.data ?? []).map((m) => m.id);
      return { ok: true, models, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, models: [], latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<string[]> {
    const h = await this.healthCheck();
    return h.models;
  }

  async chat(
    model: string,
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LocalChatResult> {
    const start = Date.now();
    const resp = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) throw new Error(`vLLM chat failed: ${resp.status}`);
    const data = await resp.json() as {
      choices?: Array<{ message?: { content: string } }>;
      usage?: { completion_tokens: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model,
      latencyMs: Date.now() - start,
      tokenCount: data.usage?.completion_tokens,
      adapter: "vllm",
    };
  }
}

class LmStudioAdapter implements LocalAdapter {
  type: LocalAdapterType = "lm-studio";
  endpoint: string;

  constructor(endpoint = "http://localhost:1234") {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.endpoint}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return { ok: false, models: [], latencyMs: Date.now() - start };
      const data = await resp.json() as { data?: Array<{ id: string }> };
      const models = (data.data ?? []).map((m) => m.id);
      return { ok: true, models, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, models: [], latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<string[]> {
    const h = await this.healthCheck();
    return h.models;
  }

  async chat(
    model: string,
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LocalChatResult> {
    const start = Date.now();
    const resp = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) throw new Error(`LM Studio chat failed: ${resp.status}`);
    const data = await resp.json() as {
      choices?: Array<{ message?: { content: string } }>;
      usage?: { completion_tokens: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model,
      latencyMs: Date.now() - start,
      tokenCount: data.usage?.completion_tokens,
      adapter: "lm-studio",
    };
  }
}

class TgiAdapter implements LocalAdapter {
  type: LocalAdapterType = "tgi";
  endpoint: string;

  constructor(endpoint = "http://localhost:8080") {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<{ ok: boolean; models: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.endpoint}/info`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return { ok: false, models: [], latencyMs: Date.now() - start };
      const data = await resp.json() as { model_id?: string };
      return {
        ok: true,
        models: data.model_id ? [data.model_id] : ["tgi-default"],
        latencyMs: Date.now() - start,
      };
    } catch {
      return { ok: false, models: [], latencyMs: Date.now() - start };
    }
  }

  async listModels(): Promise<string[]> {
    const h = await this.healthCheck();
    return h.models;
  }

  async chat(
    model: string,
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<LocalChatResult> {
    const start = Date.now();
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";
    const resp = await fetch(`${this.endpoint}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.7,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) throw new Error(`TGI chat failed: ${resp.status}`);
    const data = await resp.json() as { generated_text?: string };
    return {
      text: data.generated_text ?? "",
      model,
      latencyMs: Date.now() - start,
      adapter: "tgi",
    };
  }
}

interface AdapterRegistration {
  adapter: LocalAdapter;
  preferredModels: string[];
  enabled: boolean;
}

export class LocalModelManager {
  private adapters: Map<LocalAdapterType, AdapterRegistration> = new Map();
  private healthCache: Map<LocalAdapterType, LocalModelInfo> = new Map();
  private cacheExpireMs = 60_000;

  constructor() {
    this.registerBuiltinAdapters();
  }

  private registerBuiltinAdapters() {
    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT ?? "http://localhost:11434";
    const llamaCppEndpoint = process.env.LLAMA_CPP_ENDPOINT ?? "http://localhost:8080";
    const vllmEndpoint = process.env.VLLM_ENDPOINT ?? "http://localhost:8000";
    const lmStudioEndpoint = process.env.LM_STUDIO_ENDPOINT ?? "http://localhost:1234";
    const tgiEndpoint = process.env.TGI_ENDPOINT ?? "http://localhost:8080";

    this.adapters.set("ollama", {
      adapter: new OllamaAdapter(ollamaEndpoint),
      preferredModels: ["llama3.2:3b", "llama3.2:1b", "mistral:7b", "phi3:mini"],
      enabled: true,
    });
    this.adapters.set("llama-cpp", {
      adapter: new LlamaCppAdapter(llamaCppEndpoint),
      preferredModels: ["llama-cpp-default"],
      enabled: process.env.LLAMA_CPP_ENABLED === "true",
    });
    this.adapters.set("vllm", {
      adapter: new VllmAdapter(vllmEndpoint),
      preferredModels: [],
      enabled: process.env.VLLM_ENABLED === "true",
    });
    this.adapters.set("lm-studio", {
      adapter: new LmStudioAdapter(lmStudioEndpoint),
      preferredModels: [],
      enabled: process.env.LM_STUDIO_ENABLED === "true",
    });
    this.adapters.set("tgi", {
      adapter: new TgiAdapter(tgiEndpoint),
      preferredModels: [],
      enabled: process.env.TGI_ENABLED === "true",
    });
  }

  async checkAll(): Promise<LocalModelInfo[]> {
    const results: LocalModelInfo[] = [];
    const now = Date.now();

    for (const [type, reg] of this.adapters.entries()) {
      const cached = this.healthCache.get(type);
      if (cached && cached.lastCheckedAt && now - cached.lastCheckedAt.getTime() < this.cacheExpireMs) {
        results.push(cached);
        continue;
      }

      let info: LocalModelInfo;
      if (!reg.enabled) {
        info = {
          id: type,
          name: this.adapterDisplayName(type),
          adapter: type,
          endpoint: reg.adapter.endpoint,
          models: [],
          capabilities: this.defaultCapabilities(type),
          isAvailable: false,
          latencyMs: null,
          lastCheckedAt: new Date(),
          errorMessage: "Adapter not enabled (set env var to activate)",
        };
      } else {
        try {
          const health = await reg.adapter.healthCheck();
          info = {
            id: type,
            name: this.adapterDisplayName(type),
            adapter: type,
            endpoint: reg.adapter.endpoint,
            models: health.models.length > 0 ? health.models : reg.preferredModels,
            capabilities: this.defaultCapabilities(type),
            isAvailable: health.ok,
            latencyMs: health.latencyMs,
            lastCheckedAt: new Date(),
            errorMessage: health.ok ? undefined : "Endpoint not reachable",
          };
        } catch (err) {
          info = {
            id: type,
            name: this.adapterDisplayName(type),
            adapter: type,
            endpoint: reg.adapter.endpoint,
            models: reg.preferredModels,
            capabilities: this.defaultCapabilities(type),
            isAvailable: false,
            latencyMs: null,
            lastCheckedAt: new Date(),
            errorMessage: err instanceof Error ? err.message : String(err),
          };
        }
      }
      this.healthCache.set(type, info);
      results.push(info);
    }

    return results;
  }

  async getFirstAvailable(): Promise<{ adapter: LocalAdapter; model: string } | null> {
    const all = await this.checkAll();
    for (const info of all) {
      if (info.isAvailable && info.models.length > 0) {
        const reg = this.adapters.get(info.adapter)!;
        return { adapter: reg.adapter, model: info.models[0] };
      }
    }
    return null;
  }

  async chat(
    messages: LocalChatMessage[],
    options: { maxTokens?: number; temperature?: number; preferAdapter?: LocalAdapterType } = {},
  ): Promise<LocalChatResult | null> {
    if (options.preferAdapter) {
      const reg = this.adapters.get(options.preferAdapter);
      if (reg?.enabled) {
        const models = await reg.adapter.listModels();
        if (models.length > 0) {
          try {
            return await reg.adapter.chat(models[0], messages, options);
          } catch (err) {
            logger.warn({ err, adapter: options.preferAdapter }, "Preferred adapter failed, falling back");
          }
        }
      }
    }

    const best = await this.getFirstAvailable();
    if (!best) return null;
    return best.adapter.chat(best.model, messages, options);
  }

  getAdapterInfo(type: LocalAdapterType): LocalModelInfo | undefined {
    return this.healthCache.get(type);
  }

  private adapterDisplayName(type: LocalAdapterType): string {
    const names: Record<LocalAdapterType, string> = {
      ollama: "Ollama",
      "llama-cpp": "llama.cpp",
      vllm: "vLLM",
      "lm-studio": "LM Studio",
      tgi: "HuggingFace TGI",
    };
    return names[type];
  }

  private defaultCapabilities(type: LocalAdapterType): LocalModelCapabilities {
    const base: LocalModelCapabilities = {
      chat: true,
      completion: true,
      embeddings: false,
      vision: false,
      codeGen: true,
      maxContextTokens: 4096,
    };
    if (type === "ollama") return { ...base, embeddings: true, maxContextTokens: 32768 };
    if (type === "vllm") return { ...base, maxContextTokens: 131072 };
    if (type === "lm-studio") return { ...base, embeddings: true };
    return base;
  }
}

let _manager: LocalModelManager | null = null;

export function getLocalModelManager(): LocalModelManager {
  if (!_manager) _manager = new LocalModelManager();
  return _manager;
}
