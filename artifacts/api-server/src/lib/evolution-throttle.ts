import { logger } from "./logger";
import * as os from "os";

interface ModuleCooldown {
  moduleId: string;
  consecutiveFailures: number;
  lastFailureAt: number;
  cooldownUntil: number;
  totalFailures: number;
  totalSuccesses: number;
  paused: boolean;
}

const HIGH_LOAD_THRESHOLD = 0.85;
const HIGH_MEMORY_THRESHOLD = 0.90;

const COOLDOWN_TIERS_MS = [
  60_000,
  300_000,
  900_000,
  1_800_000,
  3_600_000,
];

const moduleCooldowns = new Map<string, ModuleCooldown>();
let globalPaused = false;

function getCooldown(moduleId: string): ModuleCooldown {
  let entry = moduleCooldowns.get(moduleId);
  if (!entry) {
    entry = {
      moduleId,
      consecutiveFailures: 0,
      lastFailureAt: 0,
      cooldownUntil: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      paused: false,
    };
    moduleCooldowns.set(moduleId, entry);
  }
  return entry;
}

export function getSystemLoad(): { cpuLoad: number; memoryUsage: number; highLoad: boolean } {
  const cpus = os.cpus();
  const cpuLoad = cpus.length > 0
    ? cpus.reduce((sum, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return sum + (1 - cpu.times.idle / total);
      }, 0) / cpus.length
    : 0;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = totalMem > 0 ? 1 - freeMem / totalMem : 0;
  return {
    cpuLoad,
    memoryUsage,
    highLoad: cpuLoad > HIGH_LOAD_THRESHOLD || memoryUsage > HIGH_MEMORY_THRESHOLD,
  };
}

export function shouldSkipEvolutionForLoad(): boolean {
  const load = getSystemLoad();
  if (load.highLoad) {
    logger.info(
      { cpuLoad: (load.cpuLoad * 100).toFixed(1) + "%", memoryUsage: (load.memoryUsage * 100).toFixed(1) + "%" },
      "EvolutionThrottle: skipping evolution cycle due to high system load",
    );
    return true;
  }
  return false;
}

export function isModuleCoolingDown(moduleId: string): boolean {
  if (globalPaused) return true;
  const entry = getCooldown(moduleId);
  if (entry.paused) return true;
  if (entry.cooldownUntil > Date.now()) return true;
  if (entry.cooldownUntil > 0 && entry.cooldownUntil <= Date.now()) {
    entry.consecutiveFailures = 0;
    entry.cooldownUntil = 0;
    logger.info({ moduleId }, "EvolutionThrottle: module auto-recovered after cooldown");
  }
  return false;
}

export function getCooldownRemainingMs(moduleId: string): number {
  const entry = getCooldown(moduleId);
  if (entry.paused) return Infinity;
  const remaining = entry.cooldownUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordEvolutionSuccess(moduleId: string): void {
  const entry = getCooldown(moduleId);
  entry.consecutiveFailures = 0;
  entry.cooldownUntil = 0;
  entry.totalSuccesses++;
}

export function recordEvolutionFailure(moduleId: string): void {
  const entry = getCooldown(moduleId);
  entry.consecutiveFailures++;
  entry.totalFailures++;
  entry.lastFailureAt = Date.now();

  if (entry.consecutiveFailures >= 5) {
    const tierIndex = Math.min(
      entry.consecutiveFailures - 5,
      COOLDOWN_TIERS_MS.length - 1,
    );
    const cooldownMs = COOLDOWN_TIERS_MS[tierIndex];
    entry.cooldownUntil = Date.now() + cooldownMs;

    logger.info(
      {
        moduleId,
        consecutiveFailures: entry.consecutiveFailures,
        cooldownMs,
        cooldownUntilISO: new Date(entry.cooldownUntil).toISOString(),
      },
      "EvolutionThrottle: module suspended after repeated failures",
    );
  }
}

export function pauseModule(moduleId: string): void {
  const entry = getCooldown(moduleId);
  entry.paused = true;
  logger.info({ moduleId }, "EvolutionThrottle: module manually paused");
}

export function resumeModule(moduleId: string): void {
  const entry = getCooldown(moduleId);
  entry.paused = false;
  entry.consecutiveFailures = 0;
  entry.cooldownUntil = 0;
  logger.info({ moduleId }, "EvolutionThrottle: module manually resumed");
}

export function pauseAllEvolution(): void {
  globalPaused = true;
  logger.info("EvolutionThrottle: all evolution paused globally");
}

export function resumeAllEvolution(): void {
  globalPaused = false;
  logger.info("EvolutionThrottle: global evolution resumed");
}

export function isGloballyPaused(): boolean {
  return globalPaused;
}

export function getThrottleMetrics() {
  const modules: Array<{
    moduleId: string;
    consecutiveFailures: number;
    totalFailures: number;
    totalSuccesses: number;
    successRate: number;
    cooldownRemainingMs: number;
    paused: boolean;
    lastFailureAt: number;
  }> = [];

  for (const [, entry] of moduleCooldowns) {
    const total = entry.totalSuccesses + entry.totalFailures;
    modules.push({
      moduleId: entry.moduleId,
      consecutiveFailures: entry.consecutiveFailures,
      totalFailures: entry.totalFailures,
      totalSuccesses: entry.totalSuccesses,
      successRate: total > 0 ? Math.round((entry.totalSuccesses / total) * 100) : 100,
      cooldownRemainingMs: Math.max(0, entry.cooldownUntil - Date.now()),
      paused: entry.paused,
      lastFailureAt: entry.lastFailureAt,
    });
  }

  return {
    globalPaused,
    modules,
    totalModulesTracked: moduleCooldowns.size,
    totalModulesCoolingDown: modules.filter(m => m.cooldownRemainingMs > 0 || m.paused).length,
  };
}

export function resetModuleCooldown(moduleId: string): void {
  const entry = getCooldown(moduleId);
  entry.consecutiveFailures = 0;
  entry.cooldownUntil = 0;
  entry.paused = false;
}

export function logEvolutionCycleSummary(): void {
  if (moduleCooldowns.size === 0) return;

  let totalOk = 0;
  let totalFail = 0;
  let coolingCount = 0;
  let pausedCount = 0;
  const troubled: string[] = [];

  for (const [, entry] of moduleCooldowns) {
    totalOk += entry.totalSuccesses;
    totalFail += entry.totalFailures;
    if (entry.cooldownUntil > Date.now()) coolingCount++;
    if (entry.paused) pausedCount++;
    if (entry.consecutiveFailures >= 5) troubled.push(entry.moduleId);
  }

  logger.info(
    {
      modules: moduleCooldowns.size,
      totalOk,
      totalFail,
      coolingDown: coolingCount,
      paused: pausedCount,
      globalPaused,
      troubled: troubled.length > 0 ? troubled : undefined,
    },
    "EvolutionThrottle: cycle summary",
  );
}
