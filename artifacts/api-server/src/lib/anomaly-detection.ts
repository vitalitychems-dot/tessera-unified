import os from "os";
import { db } from "@workspace/db";
import { anomalyEventsTable, systemLogsTable } from "@workspace/db";
import { logger } from "./logger";
import type { AnomalyEvent, AnomalyType } from "../core/types";
import { eq, and } from "drizzle-orm";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

interface SystemSnapshot {
  timestamp: Date;
  memoryHeapUsedMB: number;
  memoryHeapTotalMB: number;
  memoryPercent: number;
  cpuLoad1m: number;
  cpuCores: number;
  cpuLoadNormalized: number;
}

const THRESHOLDS = {
  memoryWarning: 0.75,
  memoryCritical: 0.90,
  cpuWarning: 0.70,
  cpuCritical: 0.90,
  errorRateWarning: 0.05,
  errorRateCritical: 0.15,
};

let recentErrorCount = 0;
let recentRequestCount = 0;

const activeAnomalyByType = new Map<AnomalyType, number>();

export function recordRequest(isError: boolean) {
  recentRequestCount++;
  if (isError) recentErrorCount++;
  if (recentRequestCount > 1000) {
    recentRequestCount = Math.floor(recentRequestCount * 0.9);
    recentErrorCount = Math.floor(recentErrorCount * 0.9);
  }
}

function takeSnapshot(): SystemSnapshot {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const memoryPercent = heapTotalMB > 0 ? heapUsedMB / heapTotalMB : 0;

  const loadAvg = os.loadavg();
  const cores = os.cpus().length;
  const cpuLoad1m = loadAvg[0] ?? 0;
  const cpuLoadNormalized = cores > 0 ? cpuLoad1m / cores : 0;

  return {
    timestamp: new Date(),
    memoryHeapUsedMB: heapUsedMB,
    memoryHeapTotalMB: heapTotalMB,
    memoryPercent,
    cpuLoad1m,
    cpuCores: cores,
    cpuLoadNormalized,
  };
}

async function openAnomaly(event: AnomalyEvent): Promise<number | null> {
  if (activeAnomalyByType.has(event.type)) {
    return null;
  }

  try {
    const rows = await db.insert(anomalyEventsTable).values({
      type: event.type,
      severity: event.severity,
      description: event.description,
      metrics: event.metrics,
      resolved: false,
      autoRemediated: false,
    }).returning({ id: anomalyEventsTable.id });

    const id = rows[0]?.id ?? null;
    if (id) activeAnomalyByType.set(event.type, id);

    await db.insert(systemLogsTable).values({
      level: event.severity === "critical" || event.severity === "high" ? "error" : "warn",
      category: "anomaly",
      message: event.description,
      source: "anomaly-detection",
      context: { type: event.type, severity: event.severity, metrics: event.metrics },
    });

    logger.warn({ type: event.type, severity: event.severity }, "Anomaly opened");
    return id;
  } catch (err) {
    logger.error({ err }, "Failed to log anomaly event");
    return null;
  }
}

async function closeAnomalyIfActive(type: AnomalyType): Promise<void> {
  const id = activeAnomalyByType.get(type);
  if (!id) return;

  try {
    await db
      .update(anomalyEventsTable)
      .set({ resolved: true, autoRemediated: true, resolvedAt: new Date() })
      .where(and(eq(anomalyEventsTable.id, id), eq(anomalyEventsTable.resolved, false)));
    activeAnomalyByType.delete(type);
    logger.info({ type, id }, "Anomaly auto-resolved — condition cleared");
  } catch (err) {
    logger.warn({ err, id }, "Failed to resolve anomaly");
  }
}

export async function runAnomalyCheck(): Promise<AnomalyEvent[]> {
  const snapshot = takeSnapshot();
  const detected: AnomalyEvent[] = [];

  if (snapshot.memoryPercent >= THRESHOLDS.memoryCritical) {
    const event: AnomalyEvent = {
      type: "memory",
      severity: "critical",
      description: `Critical memory usage: ${Math.round(snapshot.memoryPercent * 100)}% (${snapshot.memoryHeapUsedMB}MB / ${snapshot.memoryHeapTotalMB}MB)`,
      metrics: {
        heapUsedMB: snapshot.memoryHeapUsedMB,
        heapTotalMB: snapshot.memoryHeapTotalMB,
        percent: Math.round(snapshot.memoryPercent * 100),
      },
      detectedAt: snapshot.timestamp,
      resolved: false,
      autoRemediated: false,
    };
    await openAnomaly(event);
    detected.push(event);
  } else if (snapshot.memoryPercent >= THRESHOLDS.memoryWarning) {
    const event: AnomalyEvent = {
      type: "memory",
      severity: "medium",
      description: `Elevated memory usage: ${Math.round(snapshot.memoryPercent * 100)}%`,
      metrics: { percent: Math.round(snapshot.memoryPercent * 100) },
      detectedAt: snapshot.timestamp,
      resolved: false,
      autoRemediated: false,
    };
    await openAnomaly(event);
    detected.push(event);
  } else {
    await closeAnomalyIfActive("memory");
  }

  if (snapshot.cpuLoadNormalized >= THRESHOLDS.cpuCritical) {
    const event: AnomalyEvent = {
      type: "cpu",
      severity: "critical",
      description: `Critical CPU load: ${snapshot.cpuLoad1m.toFixed(2)} over ${snapshot.cpuCores} cores (${Math.round(snapshot.cpuLoadNormalized * 100)}%)`,
      metrics: { load1m: snapshot.cpuLoad1m, cores: snapshot.cpuCores, normalizedPct: Math.round(snapshot.cpuLoadNormalized * 100) },
      detectedAt: snapshot.timestamp,
      resolved: false,
      autoRemediated: false,
    };
    await openAnomaly(event);
    detected.push(event);
  } else if (snapshot.cpuLoadNormalized >= THRESHOLDS.cpuWarning) {
    const event: AnomalyEvent = {
      type: "cpu",
      severity: "medium",
      description: `Elevated CPU load: ${snapshot.cpuLoad1m.toFixed(2)}`,
      metrics: { load1m: snapshot.cpuLoad1m, normalizedPct: Math.round(snapshot.cpuLoadNormalized * 100) },
      detectedAt: snapshot.timestamp,
      resolved: false,
      autoRemediated: false,
    };
    await openAnomaly(event);
    detected.push(event);
  } else {
    await closeAnomalyIfActive("cpu");
  }

  if (recentRequestCount > 10) {
    const errorRate = recentErrorCount / recentRequestCount;
    if (errorRate >= THRESHOLDS.errorRateCritical) {
      const event: AnomalyEvent = {
        type: "error_rate",
        severity: "high",
        description: `High error rate: ${Math.round(errorRate * 100)}% of recent requests failed`,
        metrics: { errorRate: Math.round(errorRate * 100), errors: recentErrorCount, requests: recentRequestCount },
        detectedAt: snapshot.timestamp,
        resolved: false,
        autoRemediated: false,
      };
      await openAnomaly(event);
      detected.push(event);
    } else if (errorRate >= THRESHOLDS.errorRateWarning) {
      const event: AnomalyEvent = {
        type: "error_rate",
        severity: "low",
        description: `Elevated error rate: ${Math.round(errorRate * 100)}%`,
        metrics: { errorRate: Math.round(errorRate * 100) },
        detectedAt: snapshot.timestamp,
        resolved: false,
        autoRemediated: false,
      };
      await openAnomaly(event);
      detected.push(event);
    } else {
      await closeAnomalyIfActive("error_rate");
    }
  }

  return detected;
}

export interface AnomalySummary {
  total: number;
  active: number;
  critical: number;
  lastDetected: Date | null;
}

export async function getAnomalySummary(): Promise<AnomalySummary> {
  try {
    const rows = await db.select().from(anomalyEventsTable);
    const active = rows.filter(r => !r.resolved);
    const critical = rows.filter(r => !r.resolved && r.severity === "critical");
    const sorted = [...rows].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    return {
      total: rows.length,
      active: active.length,
      critical: critical.length,
      lastDetected: sorted[0] ? new Date(sorted[0].detectedAt) : null,
    };
  } catch {
    return { total: 0, active: 0, critical: 0, lastDetected: null };
  }
}

let monitorInterval: SacredHandle | null = null;

export function startAnomalyMonitor(intervalMs = 30_000): void {
  if (monitorInterval) return;
  logger.info({ intervalMs }, "Starting anomaly monitor");
  monitorInterval = setSacredInterval(async () => {
    try {
      await runAnomalyCheck();
    } catch (err) {
      logger.error({ err }, "Anomaly check failed", "anomaly-detection");
    }
  }, intervalMs, "anomaly-detection");
}

export function stopAnomalyMonitor(): void {
  if (monitorInterval) {
    clearSacredInterval(monitorInterval);
    monitorInterval = null;
    logger.info("Anomaly monitor stopped");
  }
}
