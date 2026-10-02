import { Router, type Request, type Response } from "express";
import {
  runCompressionPipeline,
  getCompressionMetrics,
  getRecentCompressionRuns,
  loadPortalJumpTableFromDb,
  portalJumpResolve,
  lookupCanonicalByDomain,
} from "../lib/semantic-compression";
import { validateMeshToken } from "../lib/mesh-auth";
import { db } from "@workspace/db";
import { knowledgeCanonicalTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Mutation routes require the same sovereign key as other admin routes.
function requireMeshAuth(req: Request, res: Response, next: () => void): void {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required" });
    return;
  }
  next();
}

// Route-level rate limiting for mutation endpoints that trigger heavy DB/embedding work.
// Returns 429 if the endpoint is called more frequently than ROUTE_RATE_LIMIT_MS.
const ROUTE_RATE_LIMIT_MS = 30_000;
const routeLastCall = new Map<string, number>();

function routeRateLimit(key: string): boolean {
  const now = Date.now();
  const last = routeLastCall.get(key) ?? 0;
  if (now - last < ROUTE_RATE_LIMIT_MS) return false;
  routeLastCall.set(key, now);
  return true;
}

router.get("/sovereign/compression/metrics", (_req, res) => {
  try {
    const metrics = getCompressionMetrics();
    res.json({ status: "ok", ...metrics });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve compression metrics", detail: (err as Error).message });
  }
});

router.post("/sovereign/compression/run", requireMeshAuth, async (req, res) => {
  if (!routeRateLimit("run")) {
    res.status(429).json({ error: "Rate limited — pipeline can only be triggered once per 30 seconds." }); return;
  }
  try {
    const { rebuildDictionary = false, minConfidence = 0.5, batchSize = 50, wait = false } = req.body ?? {};
    if (wait) {
      const metrics = await runCompressionPipeline({ rebuildDictionary, minConfidence, batchSize });
      res.json({ status: "ok", run: metrics }); return;
    }
    runCompressionPipeline({ rebuildDictionary, minConfidence, batchSize }).catch(err => {
      logger.debug({ err: (err as Error).message }, "SemanticCompression: background pipeline error");
    });
    res.json({ status: "ok", message: "Compression pipeline started in background. Poll /metrics for results." });
  } catch (err) {
    res.status(500).json({ error: "Compression pipeline failed", detail: (err as Error).message });
  }
});

router.get("/sovereign/compression/runs", requireMeshAuth, async (_req, res) => {
  try {
    const runs = await getRecentCompressionRuns(20);
    res.json({ status: "ok", runs });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve run history", detail: (err as Error).message });
  }
});

router.get("/sovereign/compression/canonical", requireMeshAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db
      .select()
      .from(knowledgeCanonicalTable)
      .orderBy(desc(knowledgeCanonicalTable.updatedAt))
      .limit(limit);
    res.json({ status: "ok", total: rows.length, canonical: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve canonical facts", detail: (err as Error).message });
  }
});

router.get("/sovereign/compression/portal/:id", requireMeshAuth, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid canonical ID" }); return; }
  const entry = portalJumpResolve(id);
  if (!entry) { res.status(404).json({ error: "No portal entry for that ID" }); return; }
  res.json({ status: "ok", entry });
});

router.get("/sovereign/compression/domain/:domain", requireMeshAuth, (req, res) => {
  const domain = String(req.params.domain);
  const entries = lookupCanonicalByDomain(domain);
  res.json({ status: "ok", domain, count: entries.length, entries });
});

router.post("/sovereign/compression/portal/warm", requireMeshAuth, async (_req, res) => {
  if (!routeRateLimit("warm")) {
    res.status(429).json({ error: "Rate limited — warm can only be triggered once per 30 seconds." }); return;
  }
  try {
    const loaded = await loadPortalJumpTableFromDb();
    res.json({ status: "ok", loaded });
  } catch (err) {
    res.status(500).json({ error: "Failed to warm portal-jump table", detail: (err as Error).message });
  }
});

export default router;
