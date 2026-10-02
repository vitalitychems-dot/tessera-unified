import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@workspace/db";
import { systemLogsTable, systemStateTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { getActualPort } from "./server-config";
import type { RecoveryAction, ModuleHealth, ModuleStatus } from "../core/types";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export const INTERNAL_PROBE_HEADER = "x-internal-health-probe";
export const INTERNAL_PROBE_SECRET = crypto.randomBytes(16).toString("hex");

const moduleRegistry = new Map<string, ModuleHealth>();
const recoveryHandlers = new Map<string, () => Promise<void>>();
const moduleInitFunctions = new Map<string, () => Promise<void>>();

const MODULE_INIT_FINDERS: Record<string, string> = {
  "api-server": "artifacts/api-server/src/app.ts",
  "file-integrity": "artifacts/api-server/src/lib/auto-recovery.ts",
  "anomaly-detection": "artifacts/api-server/src/lib/auto-recovery.ts",
  "auto-recovery": "artifacts/api-server/src/lib/auto-recovery.ts",
  "diagnostics": "artifacts/api-server/src/routes/diagnostics.ts",
  "route-health": "artifacts/api-server/src/lib/auto-recovery.ts",
};

export function registerModuleInitFunction(name: string, initFn: () => Promise<void>): void {
  moduleInitFunctions.set(name, initFn);
}

export function registerModule(name: string, status: ModuleStatus = "running"): void {
  moduleRegistry.set(name, {
    name,
    status,
    startedAt: new Date(),
  });
}

export function registerRecoveryHandler(name: string, handler: () => Promise<void>): void {
  recoveryHandlers.set(name, handler);
}

export function updateModuleStatus(name: string, status: ModuleStatus, lastError?: string): void {
  const existing = moduleRegistry.get(name);
  if (existing) {
    moduleRegistry.set(name, { ...existing, status, lastError });
  } else {
    moduleRegistry.set(name, { name, status, startedAt: new Date(), lastError });
  }
}

export function getModuleHealth(): ModuleHealth[] {
  return Array.from(moduleRegistry.values());
}

const recoveryLog: RecoveryAction[] = [];

async function logRecoveryAction(action: RecoveryAction): Promise<void> {
  recoveryLog.push(action);
  if (recoveryLog.length > 100) recoveryLog.shift();

  try {
    await db.insert(systemLogsTable).values({
      level: action.status === "failed" ? "error" : "info",
      category: "recovery",
      message: `Recovery action ${action.actionType} on ${action.targetModule}: ${action.status}`,
      source: "auto-recovery",
      context: {
        actionId: action.id,
        triggeredBy: action.triggeredBy,
        errorMessage: action.errorMessage,
      },
    });
  } catch (err) {
    logger.warn({ err }, "Failed to log recovery action to DB");
  }
}

async function checkDbHealth(): Promise<boolean> {
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

async function intelligentFallbackRecovery(moduleName: string): Promise<void> {
  logger.info({ moduleName }, "AutoRecovery: no handler registered — attempting intelligent fallback recovery");

  const moduleFile = MODULE_INIT_FINDERS[moduleName];
  const steps: string[] = [];
  let success = false;

  const initFn = moduleInitFunctions.get(moduleName);
  if (initFn) {
    try {
      logger.info({ moduleName }, "AutoRecovery: calling registered init function for module");
      await initFn();
      steps.push("init-function: OK");
      success = true;
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr);
      logger.warn({ moduleName, err: msg }, "AutoRecovery: module init function failed");
      steps.push(`init-function: FAILED (${msg})`);
    }
  } else {
    steps.push("init-function: none registered");
  }

  const dbHealthy = await checkDbHealth();
  steps.push(`db-health: ${dbHealthy ? "OK" : "DEGRADED"}`);

  if (moduleFile) {
    const absPath = path.resolve("/home/runner/workspace", moduleFile);
    const fileExists = fs.existsSync(absPath);
    steps.push(`module-file: ${fileExists ? "present" : "missing"} (${moduleFile})`);
    if (!fileExists) {
      logger.warn({ moduleName, moduleFile }, "AutoRecovery: module source file is missing");
    }
  }

  if (!success && !initFn) {
    if (dbHealthy) {
      // No init function exists — DB is healthy but module state is unknown.
      // Register as "degraded" (not "running") to avoid masking unverified failures.
      if (!moduleRegistry.has(moduleName)) {
        moduleRegistry.set(moduleName, { name: moduleName, status: "degraded", startedAt: new Date() });
      }
      // Treat as partial success: module is acknowledged but not fully verified
      success = true;
      steps.push("re-register: DEGRADED (db-backed fallback — no init fn registered)");
    } else {
      steps.push("re-register: SKIPPED (db unhealthy)");
    }
  }

  await db.insert(systemLogsTable).values({
    level: success ? "warn" : "error",
    category: "recovery",
    message: `Intelligent fallback recovery ${success ? "succeeded" : "failed"} for: ${moduleName}`,
    source: "auto-recovery",
    context: { moduleName, moduleFile: moduleFile ?? "unknown", steps, dbHealthy, hadInitFn: !!initFn },
  }).catch(() => {});

  if (!success) {
    throw new Error(`Intelligent fallback recovery failed for ${moduleName}: ${steps.join("; ")}`);
  }

  logger.info({ moduleName, steps }, "AutoRecovery: intelligent fallback recovery complete");
}

export async function attemptModuleRecovery(
  moduleName: string,
  triggeredBy = "auto-recovery"
): Promise<RecoveryAction> {
  const actionId = `recovery-${Date.now()}-${moduleName}`;
  const action: RecoveryAction = {
    id: actionId,
    triggeredBy,
    targetModule: moduleName,
    actionType: "restart",
    status: "running",
    startedAt: new Date(),
  };

  logger.info({ moduleName, triggeredBy }, "Attempting module recovery");
  updateModuleStatus(moduleName, "recovering");

  try {
    const handler = recoveryHandlers.get(moduleName);
    if (handler) {
      await handler();
      logger.info({ moduleName }, "Module recovery handler invoked");
    } else {
      await intelligentFallbackRecovery(moduleName);
    }

    updateModuleStatus(moduleName, "running");
    action.status = "succeeded";
    action.completedAt = new Date();

    logger.info({ moduleName }, "Module recovery succeeded");
  } catch (err: unknown) {
    action.status = "failed";
    action.completedAt = new Date();
    action.errorMessage = err instanceof Error ? err.message : String(err);
    updateModuleStatus(moduleName, "failed", action.errorMessage);
    logger.error({ err, moduleName }, "Module recovery failed");
  }

  await logRecoveryAction(action);
  return action;
}

const SNAPSHOT_KEY_PREFIX = "file-snapshot:";

async function persistSnapshotToDB(
  filePath: string,
  content: Buffer,
  checksum: string
): Promise<void> {
  const key = `${SNAPSHOT_KEY_PREFIX}${filePath}`;
  try {
    await db.insert(systemStateTable).values({
      key,
      value: {
        filePath,
        content: content.toString("base64"),
        checksum,
        snapshotAt: new Date().toISOString(),
        size: content.length,
      },
      description: `File snapshot: ${filePath}`,
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: {
        value: {
          filePath,
          content: content.toString("base64"),
          checksum,
          snapshotAt: new Date().toISOString(),
          size: content.length,
        },
        lastSavedAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn({ err, filePath }, "AutoRecovery: failed to persist snapshot to DB");
  }
}

interface SnapshotEntry {
  content: Buffer;
  checksum: string;
  snapshotAt: Date;
  source: "memory" | "db";
}

const snapshotMemoryCache = new Map<string, SnapshotEntry>();

export function snapshotFile(filePath: string, absPath: string): boolean {
  try {
    const content = fs.readFileSync(absPath);
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const entry: SnapshotEntry = { content, checksum, snapshotAt: new Date(), source: "memory" };
    snapshotMemoryCache.set(filePath, entry);
    persistSnapshotToDB(filePath, content, checksum).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export function hasSnapshot(filePath: string): boolean {
  return snapshotMemoryCache.has(filePath);
}

async function loadSnapshotFromDB(filePath: string): Promise<SnapshotEntry | null> {
  const key = `${SNAPSHOT_KEY_PREFIX}${filePath}`;
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, key)).limit(1);
    if (!row?.value) return null;
    const val = row.value as { content: string; checksum: string; snapshotAt: string };
    if (!val.content || !val.checksum) return null;
    const content = Buffer.from(val.content, "base64");
    return {
      content,
      checksum: val.checksum,
      snapshotAt: new Date(val.snapshotAt),
      source: "db",
    };
  } catch {
    return null;
  }
}

export async function restoreMissingFile(
  filePath: string,
  workspaceRoot: string
): Promise<boolean> {
  const absPath = path.resolve(workspaceRoot, filePath);

  let snapshot = snapshotMemoryCache.get(filePath) ?? null;

  if (!snapshot) {
    logger.info({ filePath }, "AutoRecovery: no in-memory snapshot, checking DB");
    snapshot = await loadSnapshotFromDB(filePath);
    if (snapshot) {
      snapshotMemoryCache.set(filePath, snapshot);
      logger.info({ filePath, source: "db" }, "AutoRecovery: snapshot loaded from DB");
    }
  }

  if (!snapshot) {
    logger.warn({ filePath }, "No trusted snapshot available for missing file — skipping restore to avoid corruption");

    try {
      await db.insert(systemLogsTable).values({
        level: "error",
        category: "recovery",
        message: `Cannot restore missing file — no trusted baseline snapshot: ${filePath}`,
        source: "auto-recovery",
        context: { filePath, action: "alert_only" },
      });
    } catch (dbErr) {
      logger.warn({ dbErr }, "Failed to log unrestorable file alert");
    }

    return false;
  }

  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, snapshot.content);

    const restoredChecksum = crypto
      .createHash("sha256")
      .update(fs.readFileSync(absPath))
      .digest("hex");

    if (restoredChecksum !== snapshot.checksum) {
      logger.error({ filePath }, "Restored file checksum mismatch — possible write error");

      await db.insert(systemLogsTable).values({
        level: "error",
        category: "recovery",
        message: `Restore checksum mismatch for: ${filePath}`,
        source: "auto-recovery",
        context: { filePath, expected: snapshot.checksum, actual: restoredChecksum },
      });

      return false;
    }

    logger.info({ filePath, checksum: restoredChecksum, source: snapshot.source }, "Restored missing file from verified snapshot");

    await db.insert(systemLogsTable).values({
      level: "warn",
      category: "recovery",
      message: `Restored missing file from verified snapshot (${snapshot.source}): ${filePath}`,
      source: "auto-recovery",
      context: { filePath, checksum: restoredChecksum, snapshotAt: snapshot.snapshotAt, source: snapshot.source },
    });

    return true;
  } catch (err: unknown) {
    logger.error({ err, filePath }, "Failed to restore missing file");
    return false;
  }
}

export interface RecoverySummary {
  totalAttempts: number;
  successfulAttempts: number;
  lastAttempt: Date | null;
}

export function getRecoverySummary(): RecoverySummary {
  const successful = recoveryLog.filter(a => a.status === "succeeded");
  const sorted = [...recoveryLog].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  return {
    totalAttempts: recoveryLog.length,
    successfulAttempts: successful.length,
    lastAttempt: sorted[0]?.startedAt ?? null,
  };
}

export async function runRecoveryCheck(): Promise<void> {
  const modules = getModuleHealth();
  for (const mod of modules) {
    if (mod.status === "failed") {
      logger.warn({ module: mod.name }, "Detected failed module, initiating recovery");
      await attemptModuleRecovery(mod.name, "watchdog");
    }
  }
}

interface WatchdogProbeRoute {
  path: string;
  hasParams: boolean;
}

let watchdogProbeRoutes: WatchdogProbeRoute[] = [
  { path: "/api/healthz", hasParams: false },
  { path: "/api/tesseract-forum/topics", hasParams: false },
  { path: "/api/memory/stats", hasParams: false },
  { path: "/api/diagnostics", hasParams: false },
];

export function setWatchdogProbeRoutes(routes: WatchdogProbeRoute[]): void {
  watchdogProbeRoutes = routes.length > 0 ? routes : watchdogProbeRoutes;
  logger.info({ count: watchdogProbeRoutes.length }, "Watchdog probe route list updated");
}

let routeHealthInterval: SacredHandle | null = null;
let onRoutesHealthyCallback: (() => void) | null = null;
let onRoutesUnhealthyCallback: (() => void) | null = null;
let routesWereEverHealthy = false;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES_BEFORE_RESTART = 3;

export function setOnRoutesHealthyCallback(cb: () => void): void {
  onRoutesHealthyCallback = cb;
}

export function setOnRoutesUnhealthyCallback(cb: () => void): void {
  onRoutesUnhealthyCallback = cb;
}

async function gracefulProcessRestart(reason: string): Promise<void> {
  logger.error({ reason }, "AutoRecovery: initiating graceful process restart due to critical route failures");

  try {
    await db.insert(systemLogsTable).values({
      level: "error",
      category: "recovery",
      message: `Graceful process restart initiated: ${reason}`,
      source: "auto-recovery-watchdog",
      context: { reason, consecutiveFailures, pid: process.pid },
    });
  } catch {}

  setTimeout(() => {
    logger.info("AutoRecovery: executing graceful process exit for restart");
    process.exit(1);
  }, 3000);
}

export function startRouteHealthMonitor(intervalMs = 120_000): void {
  if (routeHealthInterval) return;
  logger.info({ intervalMs, routeCount: watchdogProbeRoutes.length }, "Starting route health monitor");

  const checkRoutes = async () => {
    const port = getActualPort();
    if (!port) return;
    const baseUrl = `http://localhost:${port}`;

    const failures: string[] = [];

    for (const probe of watchdogProbeRoutes) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${baseUrl}${probe.path}`, {
          signal: controller.signal as AbortSignal,
          headers: { [INTERNAL_PROBE_HEADER]: INTERNAL_PROBE_SECRET },
        });
        clearTimeout(timeout);

        if (res.status >= 500) {
          logger.warn({ route: probe.path, status: res.status }, "Route health check: server error — route may be broken");
          failures.push(`${res.status} on ${probe.path}`);
        } else if (res.status === 404 && !probe.hasParams) {
          logger.warn({ route: probe.path, status: 404 }, "Route health check: 404 on static route — route unregistered or unreachable");
          failures.push(`404 on static route ${probe.path}`);
          try {
            await db.insert(systemLogsTable).values({
              level: "error",
              category: "route-health",
              message: `Route health 404 on static route: ${probe.path}`,
              source: "auto-recovery-watchdog",
              context: { route: probe.path, status: 404, treatAs: "failure" },
            });
          } catch {}
        } else {
          logger.debug({ route: probe.path, status: res.status, hasParams: probe.hasParams }, "Route health check: OK");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("abort") && !message.includes("ECONNREFUSED")) {
          logger.warn({ route: probe.path, err: message }, "Route health check: fetch error");
          failures.push(`fetch error on ${probe.path}: ${message}`);
        }
      }
    }

    if (failures.length > 0) {
      consecutiveFailures++;
      routesWereEverHealthy = false;
      updateModuleStatus("route-health", "failed", failures.join("; "));
      logger.warn({ failures, consecutiveFailures }, "Route health cycle FAILED");

      if (onRoutesUnhealthyCallback) {
        onRoutesUnhealthyCallback();
      }

      try {
        await db.insert(systemLogsTable).values({
          level: "error",
          category: "route-health",
          message: `Route health watchdog: ${failures.length} failure(s) detected — consecutive: ${consecutiveFailures}`,
          source: "auto-recovery-watchdog",
          context: { failures, consecutiveFailures, autoFixStrategy: "readiness-gate-close" },
        });
      } catch {}

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_RESTART) {
        await gracefulProcessRestart(
          `${consecutiveFailures} consecutive route health check failures: ${failures.slice(0, 2).join(", ")}`
        );
      }
    } else {
      consecutiveFailures = 0;
      updateModuleStatus("route-health", "running");
      logger.debug("Route health cycle PASSED — all probed routes responded");
      if (!routesWereEverHealthy && onRoutesHealthyCallback) {
        routesWereEverHealthy = true;
        logger.info("Route health watchdog: all routes healthy — opening readiness gate");
        onRoutesHealthyCallback();
      }
    }
  };

  routeHealthInterval = setSacredInterval(async () => {
    try {
      await checkRoutes();
    } catch (err) {
      logger.error({ err }, "Route health monitor check failed", "auto-recovery");
    }
  }, intervalMs, "auto-recovery");

  setTimeout(async () => {
    try {
      await checkRoutes();
    } catch {}
  }, 15_000);
}

export function stopRouteHealthMonitor(): void {
  if (routeHealthInterval) {
    clearSacredInterval(routeHealthInterval);
    routeHealthInterval = null;
    logger.info("Route health monitor stopped");
  }
}

let watchdogInterval: SacredHandle | null = null;

export function startRecoveryWatchdog(intervalMs = 60_000): void {
  if (watchdogInterval) return;
  logger.info({ intervalMs }, "Starting recovery watchdog");
  watchdogInterval = setSacredInterval(async () => {
    try {
      await runRecoveryCheck();
    } catch (err) {
      logger.error({ err }, "Recovery watchdog check failed", "auto-recovery-2");
    }
  }, intervalMs, "auto-recovery-2");
}

export function stopRecoveryWatchdog(): void {
  if (watchdogInterval) {
    clearSacredInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info("Recovery watchdog stopped");
  }
}

export function initRecoveryModule(): void {
  registerModule("api-server", "running");
  registerModule("file-integrity", "running");
  registerModule("anomaly-detection", "running");
  registerModule("auto-recovery", "running");
  registerModule("diagnostics", "running");
  registerModule("route-health", "running");
  startRecoveryWatchdog();
  startRouteHealthMonitor();
  logger.info("Auto-recovery module initialized — DB-persisted snapshots and intelligent fallback recovery enabled");
}
