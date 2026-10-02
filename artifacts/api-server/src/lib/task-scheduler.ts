import { logger } from "./logger";
import { getSystemLoad, shouldSkipEvolutionForLoad } from "./evolution-throttle";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";
import {
  getSovereigntyProfile,
  computeEffectiveWeight,
  computeAutoScaledInterval,
  computeDynamicConcurrency,
  getImpactScore,
} from "./sovereignty-impact-scoring";

/**
 * Self-Scheduling Task Engine — Sovereignty-Aware Dynamic Resource Allocator
 *
 * ARCHITECTURE: Two-tier scheduling system
 * ─────────────────────────────────────────
 * 1. **TaskScheduler** (this module): Handles application-level periodic tasks
 *    registered via `autonomous-wiring.ts`. These include: ingestion, forum engine,
 *    auto-improvement, self-code evolution, and anomaly detection. The scheduler
 *    enforces sovereignty-weighted priority ordering, dynamic concurrency (1–8
 *    slots based on system load), 5s tick intervals, bottleneck detection, and
 *    auto-scaling for consciousness and AGI training sessions.
 *
 * 2. **SovereignLoop** (`sovereign-loop.ts`): Acts as the "Master Clock" for
 *    sovereign AI engine cycles (consciousness, identity, memory vault, council,
 *    personality, etc.). When the sovereign loop starts, it calls
 *    `stopIndependentTimers()` to subsume standalone engine intervals into its
 *    unified 120s cycle. These engines intentionally run under the sovereign loop
 *    rather than this scheduler because they require strict phase ordering
 *    (ingestion → reasoning → deliberation → recalibration) that a generic
 *    priority queue cannot enforce.
 *
 * DYNAMIC RESOURCE ALLOCATION:
 * - MAX_CONCURRENT scales from 1–8 based on CPU/memory load.
 * - Priority queue is re-ranked each tick by sovereignty impact scores * urgency.
 * - Auto-scalable tasks (consciousness, AGI training, improvement) increase
 *   frequency when load < 30%, maintain minimums when load > 85%.
 * - Evolution throttle limits are always respected as an outer safety bound.
 *
 * BOTTLENECK DETECTION:
 * - Tracks rolling average duration per task (window: 10 samples).
 * - Flags tasks exceeding 3× their rolling average as bottlenecks.
 * - Reduces effective priority for chronic bottleneck tasks to shed load.
 *
 * INTENTIONALLY INDEPENDENT TIMERS:
 * - `auto-recovery.ts`: Watchdog (30s) + route health (60s) — must run even if
 *   scheduler or sovereign loop is down, so it keeps its own intervals.
 * - `session-mesh.ts`: Heartbeat checks for distributed mesh protocol — tied to
 *   mesh lifecycle, not application task scheduling.
 * - `lattice-hardware.ts`: Stale peer cleanup (60s) — simple infrastructure timer.
 * - `sovereign-cipher.ts` / `lattice-frequency-bands.ts`: Security key rotation —
 *   must remain independent for security isolation.
 */

type Priority = "critical" | "high" | "normal" | "low";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Priority is incorporated as a bounded multiplier on effective weight rather
 * than as the primary sort key. This ensures sovereignty impact scores drive
 * scheduling order — higher-impact tasks consistently win resources — while
 * priority tiers provide a proportional boost to urgency rather than a hard
 * override that ignores sovereignty contribution.
 */
const PRIORITY_WEIGHT_BOOST: Record<Priority, number> = {
  critical: 2.00,
  high: 1.50,
  normal: 1.00,
  low: 0.70,
};

const BOTTLENECK_WINDOW = 10;
const BOTTLENECK_MULTIPLIER = 3.0;
const AUTO_SCALE_TICK_EVERY = 12;

interface ScheduledTask {
  id: string;
  name: string;
  fn: () => Promise<void> | void;
  intervalMs: number;
  baseIntervalMs: number;
  priority: Priority;
  lastRunAt: number;
  nextRunAt: number;
  running: boolean;
  runCount: number;
  errorCount: number;
  lastError: string | null;
  lastDurationMs: number;
  enabled: boolean;

  durationHistory: number[];
  avgDurationMs: number;
  isBottleneck: boolean;
  bottleneckCount: number;

  sovereigntyScore: number;
  effectiveWeight: number;
  subsystem: string;

  autoScaledThisTick: boolean;
}

interface SubsystemTelemetry {
  subsystem: string;
  taskCount: number;
  runningNow: number;
  totalRuns: number;
  totalErrors: number;
  avgLatencyMs: number;
  bottleneckTasks: string[];
  successRate: number;
  avgSovereigntyScore: number;
}

interface SchedulerMetricsSnapshot {
  ts: number;
  cpuLoad: number;
  memoryUsage: number;
  concurrencySlots: number;
  runningCount: number;
  dueCount: number;
  bottleneckTasks: string[];
  throughputTasksPerMinute: number;
}

const tasks = new Map<string, ScheduledTask>();
let tickInterval: SacredHandle | null = null;
let ticking = false;
const TICK_MS = 5_000;

let tickCount = 0;
let totalTasksRun = 0;
let totalTasksRunLastMinute = 0;
let lastThroughputCalcAt = Date.now();

const metricsHistory: SchedulerMetricsSnapshot[] = [];
const MAX_METRICS_HISTORY = 60;

/**
 * Anti-starvation threshold: tasks with sovereigntyScore >= this value
 * are guaranteed execution regardless of the current concurrency limit.
 * This ensures consciousness and AGI training sessions are never displaced
 * by a full slot queue of lower-priority tasks.
 */
const SOVEREIGNTY_RESERVE_MIN_SCORE = 0.90;

/**
 * System-wide process monitor registry.
 * Other modules register callbacks here so the scheduler can expose
 * a unified picture of ALL running subsystems — not just tasks it launched.
 */
const processMonitors = new Map<string, () => Record<string, unknown>>();

export function registerProcessMonitor(name: string, fn: () => Record<string, unknown>): void {
  processMonitors.set(name, fn);
}

export function unregisterProcessMonitor(name: string): void {
  processMonitors.delete(name);
}

export function registerTask(opts: {
  id: string;
  name: string;
  fn: () => Promise<void> | void;
  intervalMs: number;
  priority?: Priority;
  enabled?: boolean;
  runImmediately?: boolean;
}): void {
  if (tasks.has(opts.id)) {
    const existing = tasks.get(opts.id)!;
    existing.fn = opts.fn;
    existing.intervalMs = opts.intervalMs;
    existing.baseIntervalMs = opts.intervalMs;
    existing.priority = opts.priority || existing.priority;
    existing.enabled = opts.enabled ?? existing.enabled;
    existing.sovereigntyScore = getImpactScore(opts.id);
    return;
  }

  const now = Date.now();
  const sovereigntyScore = getImpactScore(opts.id);
  const profile = getSovereigntyProfile(opts.id);

  const task: ScheduledTask = {
    id: opts.id,
    name: opts.name,
    fn: opts.fn,
    intervalMs: opts.intervalMs,
    baseIntervalMs: opts.intervalMs,
    priority: opts.priority || "normal",
    lastRunAt: 0,
    nextRunAt: opts.runImmediately ? now : now + opts.intervalMs,
    running: false,
    runCount: 0,
    errorCount: 0,
    lastError: null,
    lastDurationMs: 0,
    enabled: opts.enabled ?? true,

    durationHistory: [],
    avgDurationMs: 0,
    isBottleneck: false,
    bottleneckCount: 0,

    sovereigntyScore,
    effectiveWeight: sovereigntyScore,
    subsystem: profile.category,

    autoScaledThisTick: false,
  };

  tasks.set(opts.id, task);
  logger.info(
    { taskId: opts.id, name: opts.name, intervalMs: opts.intervalMs, priority: task.priority, sovereigntyScore },
    "TaskScheduler: registered",
  );
}

export function unregisterTask(id: string): void {
  tasks.delete(id);
}

export function enableTask(id: string): void {
  const task = tasks.get(id);
  if (task) {
    task.enabled = true;
    task.nextRunAt = Date.now();
  }
}

export function disableTask(id: string): void {
  const task = tasks.get(id);
  if (task) task.enabled = false;
}

function updateDurationStats(task: ScheduledTask, durationMs: number): void {
  task.durationHistory.push(durationMs);
  if (task.durationHistory.length > BOTTLENECK_WINDOW) {
    task.durationHistory.shift();
  }

  if (task.durationHistory.length > 0) {
    task.avgDurationMs = task.durationHistory.reduce((s, v) => s + v, 0) / task.durationHistory.length;
  }

  const bottleneckThreshold = task.avgDurationMs * BOTTLENECK_MULTIPLIER;
  const wasBottleneck = task.isBottleneck;
  task.isBottleneck = task.durationHistory.length >= 3 && durationMs > bottleneckThreshold && durationMs > 5_000;

  if (task.isBottleneck) {
    task.bottleneckCount++;
    if (!wasBottleneck) {
      logger.warn(
        { taskId: task.id, durationMs, avgDurationMs: Math.round(task.avgDurationMs), bottleneckCount: task.bottleneckCount },
        "TaskScheduler: bottleneck detected",
      );
    }
  }
}

async function runTask(task: ScheduledTask): Promise<void> {
  if (task.running || !task.enabled) return;
  task.running = true;
  const start = Date.now();

  try {
    await task.fn();
    task.runCount++;
    task.lastError = null;
    totalTasksRun++;
    totalTasksRunLastMinute++;
  } catch (err) {
    task.errorCount++;
    task.lastError = err instanceof Error ? err.message : String(err);
    logger.warn({ taskId: task.id, name: task.name, err: task.lastError }, "TaskScheduler: task error");
  } finally {
    task.running = false;
    const end = Date.now();
    task.lastRunAt = end;
    task.lastDurationMs = end - start;
    task.nextRunAt = end + task.intervalMs;
    updateDurationStats(task, task.lastDurationMs);
  }
}

function applyAutoScaling(systemLoadRatio: number): void {
  for (const task of tasks.values()) {
    if (!task.enabled) continue;
    const profile = getSovereigntyProfile(task.id);
    if (!profile.autoScalable) continue;

    const newInterval = computeAutoScaledInterval(task.id, task.baseIntervalMs, systemLoadRatio);
    if (newInterval !== task.intervalMs) {
      const direction = newInterval < task.intervalMs ? "faster" : "slower";
      task.intervalMs = newInterval;
      task.autoScaledThisTick = true;
      logger.debug(
        { taskId: task.id, newIntervalMs: newInterval, baseIntervalMs: task.baseIntervalMs, direction, systemLoadRatio: (systemLoadRatio * 100).toFixed(1) + "%" },
        "TaskScheduler: auto-scaled task interval",
      );
    }
  }
}

function computeThroughputRate(): number {
  const now = Date.now();
  const elapsedMinutes = (now - lastThroughputCalcAt) / 60_000;
  if (elapsedMinutes < 0.1) return 0;
  const rate = totalTasksRunLastMinute / elapsedMinutes;
  if (elapsedMinutes >= 1.0) {
    totalTasksRunLastMinute = 0;
    lastThroughputCalcAt = now;
  }
  return Math.round(rate * 10) / 10;
}

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  tickCount++;

  try {
    const systemLoad = getSystemLoad();
    const systemLoadRatio = Math.max(systemLoad.cpuLoad, systemLoad.memoryUsage * 0.7);
    const isHighLoad = systemLoad.highLoad;

    if (tickCount % AUTO_SCALE_TICK_EVERY === 0) {
      applyAutoScaling(systemLoadRatio);
    }

    const MAX_CONCURRENT = computeDynamicConcurrency(systemLoadRatio);
    let running = Array.from(tasks.values()).filter(t => t.running).length;

    if (running >= MAX_CONCURRENT) {
      ticking = false;
      return;
    }

    const now = Date.now();

    const dueTasks = Array.from(tasks.values())
      .filter(t => t.enabled && !t.running && t.nextRunAt <= now)
      .map(t => {
        const overdueMs = Math.max(0, now - t.nextRunAt);
        const bottleneckPenalty = t.isBottleneck ? 0.70 : 1.0;
        const evolutionBlocked = isHighLoad && shouldSkipEvolutionForLoad() && t.priority === "low";

        const baseWeight = evolutionBlocked
          ? 0
          : computeEffectiveWeight(t.id, overdueMs, systemLoadRatio) * bottleneckPenalty;

        const combinedWeight = baseWeight * PRIORITY_WEIGHT_BOOST[t.priority];

        t.effectiveWeight = combinedWeight;
        return { task: t, weight: combinedWeight, overdueMs };
      })
      .filter(({ weight }) => weight > 0)
      .sort((a, b) => b.weight - a.weight);

    const bottleneckTasks = dueTasks.filter(d => d.task.isBottleneck).map(d => d.task.id);

    const highSovereigntyDue = dueTasks.filter(d => d.task.sovereigntyScore >= SOVEREIGNTY_RESERVE_MIN_SCORE);
    const normalDue = dueTasks.filter(d => d.task.sovereigntyScore < SOVEREIGNTY_RESERVE_MIN_SCORE);

    for (const { task } of highSovereigntyDue) {
      runTask(task);
      running++;
    }

    const remainingSlots = Math.max(0, MAX_CONCURRENT - running);
    let slotsUsed = 0;
    for (const { task } of normalDue) {
      if (slotsUsed >= remainingSlots) break;
      runTask(task);
      running++;
      slotsUsed++;
    }

    if (tickCount % 12 === 0) {
      const snapshot: SchedulerMetricsSnapshot = {
        ts: now,
        cpuLoad: systemLoad.cpuLoad,
        memoryUsage: systemLoad.memoryUsage,
        concurrencySlots: MAX_CONCURRENT,
        runningCount: running,
        dueCount: dueTasks.length,
        bottleneckTasks,
        throughputTasksPerMinute: computeThroughputRate(),
      };
      metricsHistory.push(snapshot);
      if (metricsHistory.length > MAX_METRICS_HISTORY) metricsHistory.shift();

      if (bottleneckTasks.length > 0 || isHighLoad) {
        logger.info(
          {
            cpuLoad: (systemLoad.cpuLoad * 100).toFixed(1) + "%",
            memoryUsage: (systemLoad.memoryUsage * 100).toFixed(1) + "%",
            maxConcurrent: MAX_CONCURRENT,
            running,
            dueTasks: dueTasks.length,
            bottlenecks: bottleneckTasks,
          },
          "TaskScheduler: system pressure snapshot",
        );
      }
    }
  } finally {
    ticking = false;
  }
}

export function startScheduler(): void {
  if (tickInterval) return;
  tickInterval = setSacredInterval(tick, TICK_MS, "task-scheduler");
  tick();
  logger.info({ taskCount: tasks.size }, "TaskScheduler: started (sovereignty-aware dynamic allocator)");
}

export function stopScheduler(): void {
  if (tickInterval) {
    clearSacredInterval(tickInterval);
    tickInterval = null;
  }
  logger.info("TaskScheduler: stopped");
}

function computeSubsystemTelemetry(taskList: Array<{ id: string; subsystem: string; running: boolean; runCount: number; errorCount: number; avgDurationMs: number; isBottleneck: boolean; sovereigntyScore: number }>): SubsystemTelemetry[] {
  const bySubsystem = new Map<string, typeof taskList>();

  for (const t of taskList) {
    const group = bySubsystem.get(t.subsystem) || [];
    group.push(t);
    bySubsystem.set(t.subsystem, group);
  }

  return Array.from(bySubsystem.entries()).map(([subsystem, ts]) => {
    const totalRuns = ts.reduce((s, t) => s + t.runCount, 0);
    const totalErrors = ts.reduce((s, t) => s + t.errorCount, 0);
    const totalOps = totalRuns + totalErrors;
    const avgLatencyMs = ts.length > 0
      ? Math.round(ts.reduce((s, t) => s + t.avgDurationMs, 0) / ts.length)
      : 0;
    const avgSovereigntyScore = ts.length > 0
      ? Math.round((ts.reduce((s, t) => s + t.sovereigntyScore, 0) / ts.length) * 1000) / 1000
      : 0;

    return {
      subsystem,
      taskCount: ts.length,
      runningNow: ts.filter(t => t.running).length,
      totalRuns,
      totalErrors,
      avgLatencyMs,
      bottleneckTasks: ts.filter(t => t.isBottleneck).map(t => t.id),
      successRate: totalOps > 0 ? Math.round((totalRuns / totalOps) * 100) : 100,
      avgSovereigntyScore,
    };
  }).sort((a, b) => b.avgSovereigntyScore - a.avgSovereigntyScore);
}

export function getSchedulerMetrics() {
  const systemLoad = getSystemLoad();
  const systemLoadRatio = Math.max(systemLoad.cpuLoad, systemLoad.memoryUsage * 0.7);
  const currentMaxConcurrent = computeDynamicConcurrency(systemLoadRatio);

  const taskList = Array.from(tasks.values()).map(t => ({
    id: t.id,
    name: t.name,
    priority: t.priority,
    intervalMs: t.intervalMs,
    baseIntervalMs: t.baseIntervalMs,
    enabled: t.enabled,
    running: t.running,
    runCount: t.runCount,
    errorCount: t.errorCount,
    lastError: t.lastError,
    lastRunAt: t.lastRunAt,
    lastDurationMs: t.lastDurationMs,
    avgDurationMs: Math.round(t.avgDurationMs),
    nextRunAt: t.nextRunAt,
    isBottleneck: t.isBottleneck,
    bottleneckCount: t.bottleneckCount,
    sovereigntyScore: t.sovereigntyScore,
    effectiveWeight: Math.round(t.effectiveWeight * 1000) / 1000,
    subsystem: t.subsystem,
    autoScalable: getSovereigntyProfile(t.id).autoScalable,
    successRate:
      t.runCount + t.errorCount > 0
        ? Math.round((t.runCount / (t.runCount + t.errorCount)) * 100)
        : 100,
  }));

  const recentSnapshot = metricsHistory[metricsHistory.length - 1] ?? null;
  const bottleneckTasks = taskList.filter(t => t.isBottleneck).map(t => t.id);
  const subsystemTelemetry = computeSubsystemTelemetry(taskList);

  const systemProcesses: Record<string, unknown> = {};
  for (const [name, fn] of processMonitors) {
    try { systemProcesses[name] = fn(); } catch {}
  }

  return {
    running: tickInterval !== null,
    totalTasks: tasks.size,
    activeTasks: taskList.filter(t => t.enabled).length,
    runningNow: taskList.filter(t => t.running).length,
    totalTasksRun,
    currentMaxConcurrent,
    systemLoad: {
      cpuLoad: Math.round(systemLoad.cpuLoad * 1000) / 1000,
      memoryUsage: Math.round(systemLoad.memoryUsage * 1000) / 1000,
      highLoad: systemLoad.highLoad,
    },
    bottleneckTasks,
    throughputTasksPerMinute: computeThroughputRate(),
    recentSnapshot,
    subsystemTelemetry,
    systemProcesses,
    tasks: taskList.sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority as Priority] - PRIORITY_ORDER[b.priority as Priority] ||
        b.sovereigntyScore - a.sovereigntyScore,
    ),
  };
}

export function getSchedulerHistory(limit = 20): SchedulerMetricsSnapshot[] {
  return metricsHistory.slice(-limit);
}
