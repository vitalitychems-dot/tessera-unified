import { Router, type Request, type Response } from "express";
import {
  getThrottleMetrics,
  getSystemLoad,
  pauseModule,
  resumeModule,
  pauseAllEvolution,
  resumeAllEvolution,
  resetModuleCooldown,
} from "../lib/evolution-throttle";
import { getEvolutionMetrics } from "../lib/self-code-evolution";
import { getRecursiveSelfImprovementMetrics } from "../lib/recursive-self-improvement";
import { getSchedulerMetrics, getSchedulerHistory } from "../lib/task-scheduler";
import { getScoringMetrics } from "../lib/sovereignty-impact-scoring";
import { validateMeshToken } from "../lib/mesh-auth";
import { getRecentAttempts } from "../lib/evolution-attempt-ledger";

const router = Router();

function requireAuth(req: Request, res: Response, next: () => void): void {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required" });
    return;
  }
  next();
}

router.get("/evolution-health", (_req: Request, res: Response) => {
  const throttle = getThrottleMetrics();
  const evolution = getEvolutionMetrics();
  const improvement = getRecursiveSelfImprovementMetrics();
  const scheduler = getSchedulerMetrics();

  const systemLoad = getSystemLoad();

  res.json({
    ok: true,
    data: {
      systemLoad: {
        cpuLoad: Math.round(systemLoad.cpuLoad * 100),
        memoryUsage: Math.round(systemLoad.memoryUsage * 100),
        highLoad: systemLoad.highLoad,
      },
      throttle,
      evolution: {
        totalProposals: evolution.totalProposals,
        appliedChanges: evolution.appliedChanges,
        rejectedCount: evolution.rejectedCount,
        rolledBackChanges: evolution.rolledBackChanges,
        lastEvolutionAt: evolution.lastEvolutionAt,
        isLocked: evolution.isLocked,
      },
      improvement: {
        improvementCycles: improvement.improvementCycles,
        overallCodeHealth: improvement.overallCodeHealth,
        patches: improvement.patches,
        testing: improvement.testing,
      },
      scheduler: {
        running: scheduler.running,
        totalTasks: scheduler.totalTasks,
        activeTasks: scheduler.activeTasks,
        runningNow: scheduler.runningNow,
      },
    },
  });
});

router.get("/evolution-health/scheduler", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: {
      ...getSchedulerMetrics(),
      sovereigntyScoring: getScoringMetrics(),
      history: getSchedulerHistory(20),
    },
  });
});

router.get("/evolution-health/attempts", requireAuth, (req: Request, res: Response) => {
  const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limitNum = typeof limitRaw === "string" ? parseInt(limitRaw, 10) : 50;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 200) : 50;
  const attempts = getRecentAttempts(limit);
  const counts = attempts.reduce(
    (acc, a) => {
      acc[a.event] = (acc[a.event] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  res.json({ ok: true, data: { attempts, counts, total: attempts.length } });
});

router.post("/evolution-health/pause/:moduleId", requireAuth, (req: Request, res: Response) => {
  const moduleId = req.params.moduleId;
  if (!moduleId) {
    res.status(400).json({ ok: false, error: "moduleId required" });
    return;
  }
  if (moduleId === "_all") {
    pauseAllEvolution();
    res.json({ ok: true, message: "All evolution paused" });
  } else {
    pauseModule(String(moduleId));
    res.json({ ok: true, message: `Module ${moduleId} paused` });
  }
});

router.post("/evolution-health/resume/:moduleId", requireAuth, (req: Request, res: Response) => {
  const moduleId = req.params.moduleId;
  if (!moduleId) {
    res.status(400).json({ ok: false, error: "moduleId required" });
    return;
  }
  if (moduleId === "_all") {
    resumeAllEvolution();
    res.json({ ok: true, message: "All evolution resumed" });
  } else {
    resumeModule(String(moduleId));
    res.json({ ok: true, message: `Module ${moduleId} resumed` });
  }
});

router.post("/evolution-health/reset/:moduleId", requireAuth, (req: Request, res: Response) => {
  const moduleId = req.params.moduleId;
  if (!moduleId) {
    res.status(400).json({ ok: false, error: "moduleId required" });
    return;
  }
  resetModuleCooldown(String(moduleId));
  res.json({ ok: true, message: `Cooldown reset for ${moduleId}` });
});

export default router;
