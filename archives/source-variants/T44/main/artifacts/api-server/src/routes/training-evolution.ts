import { Router, type Request, type Response } from "express";
import { getPersonalityEvolutionMetrics, getPersonality, getAllPersonalities, recordPerformanceEvent, evolveAllPersonalities } from "../lib/personality-evolution";
import { getDaemonMetrics, runImprovementCycle } from "../lib/auto-improvement-daemon";
import { getAGITrainingMetrics, getCrossDomainTransferMetrics, triggerTrainingCycle } from "../lib/agi-training-engine";
import { getEvolutionMetrics, proposeEvolution, rollbackEvolution } from "../lib/self-code-evolution";
import { runIngestionForSource, getSourceHandlers } from "../lib/ingestion/scheduler";
import { logger } from "../lib/logger";

const MAX_SOURCES_PER_REQUEST = 6;

const router = Router();

router.get("/personality-evolution/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getPersonalityEvolutionMetrics() });
});

router.get("/personality-evolution/agents", (_req: Request, res: Response) => {
  const agents = getAllPersonalities();
  res.json({ ok: true, data: agents, count: agents.length });
});

router.get("/personality-evolution/agent/:agentId", (req: Request, res: Response) => {
  const agentId = String(req.params.agentId);
  const agent = getPersonality(agentId);
  res.json({ ok: true, data: agent });
});

router.post("/personality-evolution/event", (req: Request, res: Response) => {
  const { agentId, agentName, eventType, domain, score, context } = req.body;
  if (!agentId || !eventType || !domain || score === undefined) {
    res.status(400).json({ ok: false, error: "agentId, eventType, domain, and score are required" });
    return;
  }
  recordPerformanceEvent({ agentId, agentName: agentName || agentId, eventType, domain, score, context: context || "", timestamp: Date.now() });
  res.json({ ok: true, message: "Performance event recorded" });
});

router.post("/personality-evolution/evolve", (_req: Request, res: Response) => {
  evolveAllPersonalities();
  res.json({ ok: true, message: "Evolution cycle completed", agentCount: getAllPersonalities().length });
});

router.get("/auto-improvement/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getDaemonMetrics() });
});

router.post("/auto-improvement/cycle", async (_req: Request, res: Response) => {
  const cycle = await runImprovementCycle();
  res.json({ ok: true, data: cycle });
});

router.get("/agi-training/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getAGITrainingMetrics() });
});

router.get("/agi-training/cross-domain", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getCrossDomainTransferMetrics() });
});

/**
 * POST /api/training/full-cycle
 * Ingests fresh data from a chosen group of external sources (default: PokéAPI),
 * then runs an AGI training cycle so the new knowledge feeds the engines.
 * Body: { sources?: string[], mode?: "all" }
 *   - mode: "all"  → use every registered handler (capped to MAX_SOURCES_PER_REQUEST)
 *   - sources[]    → explicit list (deduped, capped, allowlisted against registered handlers)
 *   - omitted      → defaults to PokéAPI sources
 */
router.post("/training/full-cycle", async (req: Request, res: Response) => {
  const allHandlers = getSourceHandlers();
  const handlerSet = new Set(allHandlers);

  let requested: string[];
  if (req.body?.mode === "all") {
    requested = allHandlers.slice(0, MAX_SOURCES_PER_REQUEST);
  } else if (Array.isArray(req.body?.sources) && req.body.sources.length > 0) {
    const dedup = Array.from(new Set(req.body.sources.map(String)));
    requested = dedup.filter(s => handlerSet.has(s)).slice(0, MAX_SOURCES_PER_REQUEST);
    if (requested.length === 0) {
      res.status(400).json({ ok: false, error: "No requested sources match registered handlers" });
      return;
    }
  } else {
    requested = ["PokéAPI Species", "PokéAPI Moves", "PokéAPI Abilities", "PokéAPI Types"];
  }

  const before = getAGITrainingMetrics();
  const ingestionResults: { source: string; ingested: number; skipped: number; errors: string[] }[] = [];
  let totalIngested = 0;
  let totalSkipped = 0;
  let ingestionFailures = 0;

  const settled = await Promise.allSettled(requested.map(src => runIngestionForSource(src)));
  settled.forEach((settledRes, i) => {
    const src = requested[i];
    if (settledRes.status === "fulfilled") {
      ingestionResults.push({ source: src, ingested: settledRes.value.ingested, skipped: settledRes.value.skipped, errors: settledRes.value.errors });
      totalIngested += settledRes.value.ingested;
      totalSkipped += settledRes.value.skipped;
      if (settledRes.value.errors.length > 0 && settledRes.value.ingested === 0) ingestionFailures++;
    } else {
      const msg = settledRes.reason instanceof Error ? settledRes.reason.message : String(settledRes.reason);
      ingestionResults.push({ source: src, ingested: 0, skipped: 0, errors: [msg] });
      ingestionFailures++;
      logger.warn({ src, err: msg }, "FullCycle: source ingestion failed");
    }
  });

  let training: { sessions: number; avgScore: number } = { sessions: 0, avgScore: before.avgScore };
  let trainingError: string | null = null;
  try {
    training = await triggerTrainingCycle();
  } catch (err) {
    trainingError = err instanceof Error ? err.message : String(err);
    logger.warn({ err: trainingError }, "FullCycle: training trigger failed");
  }

  const after = getAGITrainingMetrics();
  const allIngestionFailed = ingestionFailures === requested.length;
  const ok = !allIngestionFailed && !trainingError;

  res.status(ok ? 200 : 502).json({
    ok,
    sources: requested,
    error: trainingError ?? (allIngestionFailed ? "All requested sources failed to ingest" : null),
    ingestion: { totalIngested, totalSkipped, perSource: ingestionResults },
    training: {
      sessionsRun: training.sessions,
      avgScoreBefore: Math.round(before.avgScore * 100) / 100,
      avgScoreAfter: Math.round(after.avgScore * 100) / 100,
      delta: Math.round((after.avgScore - before.avgScore) * 100) / 100,
      totalCycles: after.totalCycles,
      error: trainingError,
    },
  });
});

router.get("/self-evolution/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getEvolutionMetrics() });
});

router.post("/self-evolution/propose", async (req: Request, res: Response) => {
  const { targetModule, proposedChange, rationale, riskLevel = "low" } = req.body;
  if (!targetModule || !proposedChange || !rationale) {
    res.status(400).json({ ok: false, error: "targetModule, proposedChange, and rationale are required" });
    return;
  }
  const proposal = await proposeEvolution(targetModule, proposedChange, rationale, riskLevel);
  res.json({ ok: true, data: proposal });
});

router.post("/self-evolution/rollback/:proposalId", (req: Request, res: Response) => {
  const proposalId = String(req.params.proposalId);
  const success = rollbackEvolution(proposalId);
  res.json({ ok: success, message: success ? `Rolled back ${proposalId}` : `Cannot rollback ${proposalId}` });
});

export default router;
