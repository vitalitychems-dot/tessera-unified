import { Router } from "express";
import { logger } from "../lib/logger";
import { getLocalModelManager, type LocalAdapterType } from "../lib/local-model-manager";

const router = Router();

router.get("/local-models/status", async (_req, res) => {
  try {
    const manager = getLocalModelManager();
    const infos = await manager.checkAll();
    const availableCount = infos.filter((i) => i.isAvailable).length;
    return res.json({
      ok: true,
      adapters: infos,
      availableCount,
      totalCount: infos.length,
      sovereignCapacity: availableCount > 0 ? "AVAILABLE" : "NONE",
    });
  } catch (err) {
    logger.error({ err }, "GET /local-models/status failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/local-models/health-check", async (_req, res) => {
  try {
    const manager = getLocalModelManager();
    const infos = await manager.checkAll();
    return res.json({ ok: true, results: infos, checkedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "POST /local-models/health-check failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/local-models/chat", async (req, res) => {
  try {
    const { messages, maxTokens, temperature, preferAdapter } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: "messages[] is required" });
    }
    const manager = getLocalModelManager();
    const result = await manager.chat(messages, {
      maxTokens: maxTokens ?? 512,
      temperature: temperature ?? 0.7,
      preferAdapter: preferAdapter as LocalAdapterType | undefined,
    });
    if (!result) {
      return res.status(503).json({ ok: false, error: "No local models available. Deploy Ollama or another adapter." });
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /local-models/chat failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/local-models/adapters", (_req, res) => {
  return res.json({
    ok: true,
    adapters: [
      {
        id: "ollama",
        name: "Ollama",
        defaultEndpoint: "http://localhost:11434",
        status: "reference-implementation",
        description: "Full reference implementation. Run `ollama serve` and pull models with `ollama pull llama3.2:3b`.",
        envVar: "OLLAMA_ENDPOINT",
        docs: "https://ollama.com",
      },
      {
        id: "llama-cpp",
        name: "llama.cpp",
        defaultEndpoint: "http://localhost:8080",
        status: "stub",
        description: "llama.cpp HTTP server. Run `./server -m model.gguf --host 0.0.0.0 --port 8080`.",
        envVar: "LLAMA_CPP_ENDPOINT",
        enableVar: "LLAMA_CPP_ENABLED=true",
        docs: "https://github.com/ggerganov/llama.cpp",
      },
      {
        id: "vllm",
        name: "vLLM",
        defaultEndpoint: "http://localhost:8000",
        status: "stub",
        description: "vLLM OpenAI-compatible server. Requires CUDA GPU. `python -m vllm.entrypoints.openai.api_server --model <model>`.",
        envVar: "VLLM_ENDPOINT",
        enableVar: "VLLM_ENABLED=true",
        docs: "https://github.com/vllm-project/vllm",
      },
      {
        id: "lm-studio",
        name: "LM Studio",
        defaultEndpoint: "http://localhost:1234",
        status: "stub",
        description: "LM Studio local server. Enable 'Local Server' in LM Studio app settings.",
        envVar: "LM_STUDIO_ENDPOINT",
        enableVar: "LM_STUDIO_ENABLED=true",
        docs: "https://lmstudio.ai",
      },
      {
        id: "tgi",
        name: "HuggingFace TGI",
        defaultEndpoint: "http://localhost:8080",
        status: "stub",
        description: "HuggingFace Text Generation Inference. `docker run --gpus all ghcr.io/huggingface/text-generation-inference --model-id <model>`.",
        envVar: "TGI_ENDPOINT",
        enableVar: "TGI_ENABLED=true",
        docs: "https://github.com/huggingface/text-generation-inference",
      },
    ],
  });
});

export default router;
