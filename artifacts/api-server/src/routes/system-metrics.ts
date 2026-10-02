import { Router, type IRouter } from "express";
import * as os from "os";
import { db } from "@workspace/db";
import { councilDecisionsTable, inventionsTable, councilMeetingsTable } from "@workspace/db/schema";
import { count, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { computeWorldState, computeMarketData } from "../lib/sovereign-economics";
import { computeLunarData, computeSolarData } from "../lib/sovereign-astro";
import { computeNetworkTopology, computeSwarmStatus } from "../lib/sovereign-network";
import { computeSacredFrequencies, computeDNAHealingStatus } from "../lib/sovereign-harmonics";

const router: IRouter = Router();

const startTime = Date.now();

router.get("/system/sovereign-metrics", async (_req, res) => {
  try {
    const now = Date.now();
    const mem = process.memoryUsage();
    const cpus = os.cpus();

    let dbStats = { councilDecisions: 0, inventions: 0, meetings: 0 };
    try {
      const [dc] = await db.select({ count: count() }).from(councilDecisionsTable);
      const [inv] = await db.select({ count: count() }).from(inventionsTable);
      const [meet] = await db.select({ count: count() }).from(councilMeetingsTable);
      dbStats = {
        councilDecisions: dc?.count ?? 0,
        inventions: inv?.count ?? 0,
        meetings: meet?.count ?? 0,
      };
    } catch (err) {
      logger.error({ err }, "Failed to query DB stats for system metrics");
    }

    const engineStatus: Record<string, boolean> = {};
    const engines = [
      { name: "sovereign-economics", fn: () => computeWorldState(now) },
      { name: "sovereign-market", fn: () => computeMarketData(now) },
      { name: "sovereign-astro-lunar", fn: () => computeLunarData() },
      { name: "sovereign-astro-solar", fn: () => computeSolarData() },
      { name: "sovereign-network", fn: () => computeNetworkTopology(now) },
      { name: "sovereign-swarm", fn: () => computeSwarmStatus(now) },
      { name: "sovereign-frequencies", fn: () => computeSacredFrequencies() },
      { name: "sovereign-dna-healing", fn: () => computeDNAHealingStatus() },
    ];

    for (const engine of engines) {
      try {
        engine.fn();
        engineStatus[engine.name] = true;
      } catch (err) {
        logger.error({ err, engine: engine.name }, "Engine status check failed");
        engineStatus[engine.name] = false;
      }
    }

    const activeEngines = Object.values(engineStatus).filter(Boolean).length;
    const totalEngines = engines.length;

    return res.json({
      ok: true,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.round(process.uptime()),
        systemUptime: Math.round(os.uptime()),
        serverStartedAt: new Date(startTime).toISOString(),
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
        externalMB: Math.round(mem.external / 1024 / 1024),
        systemTotalMB: Math.round(os.totalmem() / 1024 / 1024),
        systemFreeMB: Math.round(os.freemem() / 1024 / 1024),
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model ?? "Unknown",
        loadAverage: os.loadavg(),
      },
      engines: {
        status: engineStatus,
        active: activeEngines,
        total: totalEngines,
        healthPercent: Math.round((activeEngines / totalEngines) * 100),
      },
      database: dbStats,
      routes: {
        total: 28,
        categories: [
          "health", "diagnostics", "security", "security-defense",
          "provider-sovereignty", "memory", "reasoning", "swarm",
          "ingestion", "inventions", "council", "council-meeting",
          "lattice-hardware", "conversations", "world", "forum",
          "sovereign-data", "benchmark-audit", "fleet-synapse",
          "colonial-language", "mesh", "evaluation", "routing",
          "ontology", "improvement", "roadmap", "sovereignty-score",
          "system-metrics",
        ],
      },
      timestamp: now,
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute system metrics");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/system/engines", async (_req, res) => {
  try {
    const now = Date.now();
    const engineResults: Record<string, { status: string; latencyMs: number; data?: unknown; error?: string }> = {};

    const engines = [
      { name: "economics-world", fn: () => computeWorldState(now) },
      { name: "economics-market", fn: () => computeMarketData(now) },
      { name: "astro-lunar", fn: () => computeLunarData() },
      { name: "astro-solar", fn: () => computeSolarData() },
      { name: "network-topology", fn: () => computeNetworkTopology(now) },
      { name: "network-swarm", fn: () => computeSwarmStatus(now) },
      { name: "harmonics-frequencies", fn: () => computeSacredFrequencies() },
      { name: "harmonics-dna", fn: () => computeDNAHealingStatus() },
    ];

    for (const engine of engines) {
      const start = performance.now();
      try {
        const data = engine.fn();
        const latency = performance.now() - start;
        engineResults[engine.name] = { status: "active", latencyMs: Math.round(latency * 100) / 100, data };
      } catch (e) {
        const latency = performance.now() - start;
        engineResults[engine.name] = { status: "error", latencyMs: Math.round(latency * 100) / 100, error: (e as Error).message };
      }
    }

    return res.json({
      ok: true,
      engines: engineResults,
      summary: {
        active: Object.values(engineResults).filter(e => e.status === "active").length,
        errored: Object.values(engineResults).filter(e => e.status === "error").length,
        totalLatencyMs: Object.values(engineResults).reduce((sum, e) => sum + e.latencyMs, 0),
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
