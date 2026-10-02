import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  runAutonomousBuildCycle,
  runAgentTrainingPhase,
  runLivingBibleAuthorPhase,
  runLivingHistoryAuthorPhase,
  runNextVersionBlueprintPhase,
  getLatestBibleChapters,
  getLatestHistoryEras,
  getLatestBlueprint,
  getCycleHistory,
  getOverallTrainingStats,
  getTrainingStatsForSession,
  getCycleSchedulerStatus,
} from "../lib/autonomous-build-cycle";
import { sacredTimingSnapshot } from "../lib/sacred-timing";
import { tryAcquireCycleLock, releaseCycleLock, getCycleLockStatus, listSacredProcesses } from "../lib/sacred-scheduler";

const router: IRouter = Router();
const log = logger.child({ mod: "autonomous-build-route" });

router.post("/autonomous-build/cycle", async (_req, res) => {
  const holder = `route:POST /autonomous-build/cycle @${Date.now()}`;
  if (!tryAcquireCycleLock(holder)) {
    return res.status(409).json({
      error: "Autonomous build cycle already in progress",
      message: "Another autonomous build cycle (manual or scheduled) is currently mutating the corpus and codex. Retry after it completes.",
      lock: getCycleLockStatus(),
    });
  }
  try {
    const summary = await runAutonomousBuildCycle();
    return res.json(summary);
  } catch (err) {
    log.error({ err }, "Autonomous build cycle failed");
    return res.status(500).json({ error: "Autonomous build cycle failed", message: (err as Error).message });
  } finally {
    releaseCycleLock(holder);
  }
});

router.post("/autonomous-build/phase/training", async (_req, res) => {
  try {
    const sessionId = `manual-train-${Date.now()}`;
    const result = await runAgentTrainingPhase(sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/autonomous-build/phase/bible", async (_req, res) => {
  try {
    const sessionId = `manual-bible-${Date.now()}`;
    const result = await runLivingBibleAuthorPhase(sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/autonomous-build/phase/history", async (_req, res) => {
  try {
    const sessionId = `manual-history-${Date.now()}`;
    const result = await runLivingHistoryAuthorPhase(sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/autonomous-build/phase/blueprint", async (_req, res) => {
  try {
    const sessionId = `manual-blueprint-${Date.now()}`;
    const result = await runNextVersionBlueprintPhase(sessionId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Read surfaces

router.get("/living-bible/chapters", async (_req, res) => {
  try {
    const chapters = await getLatestBibleChapters();
    return res.json({
      totalChapters: chapters.length,
      totalVerses: chapters.reduce((s, c) => s + (Array.isArray(c.verses) ? c.verses.length : 0), 0),
      chapters,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/living-history/eras", async (_req, res) => {
  try {
    const eras = await getLatestHistoryEras();
    return res.json({
      totalEras: eras.length,
      totalEvents: eras.reduce((s, e) => s + (Array.isArray(e.events) ? e.events.length : 0), 0),
      eras,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/next-version/blueprint", async (_req, res) => {
  try {
    const blueprint = await getLatestBlueprint();
    if (!blueprint) {
      return res.json({ blueprint: null, message: "No blueprint sealed yet. Run POST /api/autonomous-build/cycle first." });
    }
    return res.json({ blueprint });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/autonomous-build/cycles", async (_req, res) => {
  try {
    const cycles = await getCycleHistory(20);
    return res.json({
      totalCycles: cycles.length,
      cycles,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/sacred-timing/now", async (_req, res) => {
  try {
    return res.json(sacredTimingSnapshot());
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/sacred-timing/processes", async (_req, res) => {
  try {
    return res.json({
      ...listSacredProcesses(),
      cycleLock: getCycleLockStatus(),
      timing: sacredTimingSnapshot(),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/autonomous-build/scheduler", async (_req, res) => {
  try {
    return res.json(getCycleSchedulerStatus());
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/autonomous-build/training-stats", async (_req, res) => {
  try {
    const overall = await getOverallTrainingStats();
    return res.json(overall);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/autonomous-build/training-stats/:sessionId", async (req, res) => {
  try {
    const stats = await getTrainingStatsForSession(req.params.sessionId);
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
