import { Router } from "express";
import { logger } from "../lib/logger";
import { runTrainingOrchestrator, getTrainingStatus, runSelfAudit } from "../lib/training-orchestrator";
import { runDependencyScan, getScannedDependencies, isDependencyScanComplete } from "../lib/dependency-scanner";
import { getQuarantineStats } from "../lib/quarantine-gate";

const router = Router();

router.post("/training/run", async (req, res): Promise<void> => {
  try {
    const status = getTrainingStatus();
    if (status.isRunning) {
      res.json({ ok: false, message: "Training already in progress", status });
      return;
    }

    const cycles = Math.min(parseInt(req.body?.cycles ?? "10", 10), 10);

    res.json({
      ok: true,
      message: `Starting ${cycles}-cycle training orchestrator in background`,
      cycles,
    });

    runTrainingOrchestrator(cycles).catch(err => {
      logger.error({ err }, "Training orchestrator error");
    });
  } catch (err) {
    logger.error({ err }, "POST /training/run failed");
    res.status(500).json({ error: "Failed to start training", details: String(err) });
  }
});

router.get("/training/status", async (_req, res) => {
  try {
    const status = getTrainingStatus();
    return res.json({
      ok: true,
      isRunning: status.isRunning,
      currentCycle: status.currentCycle,
      totalCycles: status.totalCycles,
      overallProgress: Math.round(status.overallProgress * 100),
      startedAt: status.startedAt?.toISOString(),
      completedAt: status.completedAt?.toISOString(),
      cyclesCompleted: status.cycleResults.length,
      cycleScores: status.cycleResults.map(c => ({
        cycleNumber: c.cycleNumber,
        score: c.cycleScore,
        gapAreas: c.gapAreas.length,
        problemsAttempted: c.problemsAttempted,
        evalScore: c.evalSuite?.percentile ?? null,
        completedAt: c.completedAt.toISOString(),
      })),
      latestCycleReport: status.cycleResults.at(-1)?.report ?? null,
      avgCycleScore: status.cycleResults.length > 0
        ? Math.round(status.cycleResults.reduce((s, c) => s + c.cycleScore, 0) / status.cycleResults.length)
        : 0,
    });
  } catch (err) {
    logger.error({ err }, "GET /training/status failed");
    return res.status(500).json({ error: "Failed to get training status", details: String(err) });
  }
});

router.get("/training/cycles", async (_req, res) => {
  try {
    const status = getTrainingStatus();
    return res.json({
      ok: true,
      cycles: status.cycleResults.map(c => ({
        cycleNumber: c.cycleNumber,
        score: c.cycleScore,
        problemsAttempted: c.problemsAttempted,
        problemsSolved: c.problemsSolved.length,
        gapAreas: c.gapAreas,
        knowledgeReinforced: c.knowledgeReinforced,
        agentScores: c.agentScores,
        evalScore: c.evalSuite?.percentile ?? null,
        evalGrade: c.evalSuite?.grade ?? null,
        durationMs: c.durationMs,
        completedAt: c.completedAt.toISOString(),
        report: c.report,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /training/cycles failed");
    return res.status(500).json({ error: "Failed to get training cycles", details: String(err) });
  }
});

router.post("/training/self-audit", async (_req, res) => {
  try {
    const result = await runSelfAudit();
    return res.json({
      ok: true,
      ...result,
      auditedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "POST /training/self-audit failed");
    return res.status(500).json({ error: "Self-audit failed", details: String(err) });
  }
});

router.post("/dependency-scan/run", async (_req, res) => {
  try {
    const result = await runDependencyScan(true);
    return res.json({
      ok: true,
      ...result,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "POST /dependency-scan/run failed");
    return res.status(500).json({ error: "Dependency scan failed", details: String(err) });
  }
});

router.get("/dependency-scan/status", async (_req, res) => {
  try {
    const deps = getScannedDependencies();
    const complete = isDependencyScanComplete();
    return res.json({
      ok: true,
      complete,
      scannedCount: deps.length,
      dependencies: deps.map(d => ({
        name: d.name,
        description: d.description,
        capabilityCount: d.capabilities.length,
        patternCount: d.patterns.length,
        apiSurfaceCount: d.apiSurface.length,
        scannedAt: d.scannedAt.toISOString(),
        hasMemoryEntry: !!d.embeddingId,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /dependency-scan/status failed");
    return res.status(500).json({ error: "Failed to get dependency scan status", details: String(err) });
  }
});

router.get("/quarantine/stats", async (_req, res) => {
  try {
    const stats = getQuarantineStats();
    return res.json({
      ok: true,
      stats,
      total: stats.absorbed + stats.rejected + stats.sanitized,
    });
  } catch (err) {
    logger.error({ err }, "GET /quarantine/stats failed");
    return res.status(500).json({ error: "Failed to get quarantine stats", details: String(err) });
  }
});

export default router;
