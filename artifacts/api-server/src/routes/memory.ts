import { Router, type IRouter } from "express";
import {
  storeMemory,
  searchMemory,
  getMemoryStats,
  logDecision,
  getDecisions,
  saveState,
  restoreState,
  getAllState,
} from "../lib/vector-memory";
import { db } from "@workspace/db";
import { vectorEmbeddingsTable, decisionHistoryTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { validateMeshToken } from "../lib/mesh-auth";
import { meshBroadcast } from "../lib/mesh-bus";

const router: IRouter = Router();

router.get("/memory/entries", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);
    const rows = await db.select({
      id: vectorEmbeddingsTable.id,
      content: vectorEmbeddingsTable.content,
      source: vectorEmbeddingsTable.source,
      category: vectorEmbeddingsTable.category,
      metadata: vectorEmbeddingsTable.metadata,
      accessCount: vectorEmbeddingsTable.accessCount,
      createdAt: vectorEmbeddingsTable.createdAt,
    }).from(vectorEmbeddingsTable).orderBy(desc(vectorEmbeddingsTable.createdAt)).limit(limit).offset(offset);
    return res.json({ ok: true, entries: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/stats", async (_req, res) => {
  try {
    const stats = await getMemoryStats();
    return res.json({ ok: true, ...stats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/memory/search", async (req, res) => {
  try {
    const { query, topK = 10, category } = req.body as { query: string; topK?: number; category?: string };
    if (!query || typeof query !== "string") {
      return res.status(400).json({ ok: false, error: "query is required" });
    }
    const results = await searchMemory(query.trim(), Math.min(topK, 50), category);
    return res.json({ ok: true, results, count: results.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/search", async (req, res) => {
  try {
    const query = String(req.query.q ?? "");
    const topK = Math.min(parseInt(String(req.query.topK ?? "10"), 10), 50);
    const category = req.query.category ? String(req.query.category) : undefined;
    if (!query) return res.status(400).json({ ok: false, error: "q is required" });
    const results = await searchMemory(query, topK, category);
    return res.json({ ok: true, results, count: results.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/memory/store", async (req, res) => {
  try {
    const { content, source, category, metadata } = req.body as {
      content: string;
      source?: string;
      category?: string;
      metadata?: Record<string, unknown>;
    };
    if (!content || typeof content !== "string") {
      return res.status(400).json({ ok: false, error: "content is required" });
    }
    const id = await storeMemory({ content: content.trim(), source, category, metadata });

    const rawToken = req.headers["x-admin-token"];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const keyHash = validateMeshToken(token ?? "");
    if (keyHash) {
      meshBroadcast(keyHash, "memory:stored", {
        id,
        contentPreview: content.slice(0, 80),
        source,
        category,
      });
    }

    return res.json({ ok: true, id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/embeddings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);
    const rows = await db.select({
      id: vectorEmbeddingsTable.id,
      content: vectorEmbeddingsTable.content,
      source: vectorEmbeddingsTable.source,
      category: vectorEmbeddingsTable.category,
      metadata: vectorEmbeddingsTable.metadata,
      accessCount: vectorEmbeddingsTable.accessCount,
      createdAt: vectorEmbeddingsTable.createdAt,
    }).from(vectorEmbeddingsTable).orderBy(desc(vectorEmbeddingsTable.createdAt)).limit(limit).offset(offset);
    return res.json({ ok: true, rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/memory/embeddings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(vectorEmbeddingsTable).where(eq(vectorEmbeddingsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/decisions", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const category = req.query.category ? String(req.query.category) : undefined;
    const significance = req.query.significance ? String(req.query.significance) : undefined;
    const rows = await getDecisions({ limit, category, significance });
    return res.json({ ok: true, decisions: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/memory/decisions", async (req, res) => {
  try {
    const { action, category, rationale, context, outcome, significance, source, sessionId } = req.body as {
      action: string;
      category?: string;
      rationale: string;
      context?: Record<string, unknown>;
      outcome?: string;
      significance?: "low" | "medium" | "high" | "critical";
      source?: string;
      sessionId?: string;
    };
    if (!action || !rationale) {
      return res.status(400).json({ ok: false, error: "action and rationale are required" });
    }
    const id = await logDecision({ action, category, rationale, context, outcome, significance, source, sessionId });

    const rawToken = req.headers["x-admin-token"];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const keyHash = validateMeshToken(token ?? "");
    if (keyHash) {
      meshBroadcast(keyHash, "memory:decision-logged", {
        id,
        action,
        category,
        significance: significance ?? "low",
        source,
      });
    }

    return res.json({ ok: true, id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/state", async (_req, res) => {
  try {
    const rows = await getAllState();
    return res.json({ ok: true, state: rows, count: rows.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/memory/state/:key", async (req, res) => {
  try {
    const value = await restoreState(req.params.key);
    if (value === null) return res.status(404).json({ ok: false, error: "Key not found" });
    return res.json({ ok: true, key: req.params.key, value });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.put("/memory/state/:key", async (req, res) => {
  try {
    const { value, description } = req.body as { value: unknown; description?: string };
    if (value === undefined) return res.status(400).json({ ok: false, error: "value is required" });
    await saveState(req.params.key, value, description);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
