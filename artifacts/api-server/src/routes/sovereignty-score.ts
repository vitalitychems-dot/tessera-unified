import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { runFullBenchmark } from "../lib/sovereign-benchmarks";

const router: IRouter = Router();

let cachedReport: Awaited<ReturnType<typeof runFullBenchmark>> | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 30000;

router.get("/sovereignty/score", async (_req, res) => {
  try {
    const now = Date.now();
    if (!cachedReport || (now - cacheTime) > CACHE_TTL_MS) {
      cachedReport = await runFullBenchmark();
      cacheTime = now;
    }

    const report = cachedReport;

    const moduleScores: Record<string, { active: boolean; score: number; maxScore: number; percentile: number; testsPassed: number; totalTests: number }> = {};
    for (const mod of report.modules) {
      moduleScores[mod.module] = {
        active: mod.percentile > 0,
        score: mod.score,
        maxScore: mod.maxScore,
        percentile: mod.percentile,
        testsPassed: mod.tests.filter(t => t.passed).length,
        totalTests: mod.tests.length,
      };
    }

    return res.json({
      ok: true,
      sovereignty: {
        overallScore: report.percentile,
        level: report.level,
        breakdown: {
          totalPoints: report.overallScore,
          maxPoints: report.overallMax,
          testsPassed: report.testsPassed,
          totalTests: report.totalTests,
          localComputeRatio: report.localComputeRatio,
          externalApiCalls: report.externalApiCalls,
        },
        modules: moduleScores,
        activeModules: report.modules.filter(m => m.percentile > 0).length,
        totalModules: report.modules.length,
      },
      benchmarkMethod: report.method,
      totalLatencyMs: report.totalLatencyMs,
      timestamp: report.timestamp,
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute sovereignty score");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/sovereignty/benchmark", async (_req, res) => {
  try {
    const report = await runFullBenchmark();
    cachedReport = report;
    cacheTime = Date.now();

    return res.json({
      ok: true,
      report,
    });
  } catch (err) {
    logger.error({ err }, "Failed to run full benchmark");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/sovereignty/modules", async (_req, res) => {
  try {
    const now = Date.now();
    if (!cachedReport || (now - cacheTime) > CACHE_TTL_MS) {
      cachedReport = await runFullBenchmark();
      cacheTime = now;
    }

    return res.json({
      ok: true,
      modules: cachedReport.modules.map(m => ({
        module: m.module,
        score: m.score,
        maxScore: m.maxScore,
        percentile: m.percentile,
        isLocal: m.isLocal,
        externalDeps: m.externalDeps,
        latencyMs: m.latencyMs,
        tests: m.tests,
      })),
      activeCount: cachedReport.modules.filter(m => m.percentile > 0).length,
      totalCount: cachedReport.modules.length,
      timestamp: cachedReport.timestamp,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
