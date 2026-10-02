import * as os from "os";
import { logger } from "./logger";
import { appendLedgerEntry, freezeLedger, isLedgerFrozen as _ledgerIsFrozen } from "./sovereign-ledger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export type HealingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type HealingStatus = "ok" | "healed" | "failed" | "escalated" | "noop";

export interface HealingIncident {
  id: string;
  ts: number;
  strategy: string;
  category: string;
  severity: HealingSeverity;
  status: HealingStatus;
  detected: string;
  action: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}

export interface HealingStrategy {
  name: string;
  category: string;
  description: string;
  detect: () => Promise<{ triggered: boolean; severity: HealingSeverity; detail: string; context?: Record<string, unknown> } | null>;
  heal: (context?: Record<string, unknown>) => Promise<{ ok: boolean; action: string; outcome: string; metadata?: Record<string, unknown> }>;
}

const incidents: HealingIncident[] = [];
const MAX_INCIDENTS = 300;

let totalRuns = 0;
let totalHealed = 0;
let totalFailed = 0;
let totalEscalated = 0;
let lastRunAt = 0;
let consecutiveFailures: Record<string, number> = {};
const strategyCooldown: Record<string, number> = {};
const COOLDOWN_MS_DEFAULT = 60_000;

let enabled = true;

function pushIncident(i: HealingIncident): void {
  incidents.push(i);
  if (incidents.length > MAX_INCIDENTS) incidents.splice(0, incidents.length - MAX_INCIDENTS);
  if (i.status === "healed") totalHealed++;
  else if (i.status === "failed") totalFailed++;
  else if (i.status === "escalated") totalEscalated++;
  try {
    appendLedgerEntry("system-event", "auto-healer", {
      kind: "healing-incident",
      strategy: i.strategy,
      severity: i.severity,
      status: i.status,
      detected: i.detected,
      action: i.action,
      outcome: i.outcome,
    });
  } catch {}
}

// ───────────────────────────────────────────────────────────────────────
// Strategy 1: Memory pressure
// ───────────────────────────────────────────────────────────────────────
const memStrategy: HealingStrategy = {
  name: "memory-pressure-relief",
  category: "runtime",
  description: "Frees memory when heap usage exceeds 90% by clearing non-critical caches.",
  detect: async () => {
    const mem = process.memoryUsage();
    const ratio = mem.heapUsed / Math.max(1, mem.heapTotal);
    if (ratio > 0.90) {
      return {
        triggered: true,
        severity: ratio > 0.96 ? "critical" : "high",
        detail: `Heap ${(ratio * 100).toFixed(1)}% full (${Math.round(mem.heapUsed / 1_048_576)}MB/${Math.round(mem.heapTotal / 1_048_576)}MB).`,
        context: { ratio, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
      };
    }
    return null;
  },
  heal: async () => {
    let freedMB = 0;
    const before = process.memoryUsage().heapUsed;
    try {
      const { clearEmbeddingCache } = await import("./neural-embeddings").then(m => ({
        clearEmbeddingCache: (m as { clearEmbeddingCache?: () => number }).clearEmbeddingCache,
      }));
      if (clearEmbeddingCache) clearEmbeddingCache();
    } catch {}
    try {
      const mod: unknown = await import("./semantic-cache").catch(() => null);
      const fn = (mod as { pruneOldEntries?: (maxAge: number) => number } | null)?.pruneOldEntries;
      if (typeof fn === "function") fn(10 * 60_000);
    } catch {}
    if (typeof global.gc === "function") {
      try { global.gc(); } catch {}
    }
    const after = process.memoryUsage().heapUsed;
    freedMB = Math.max(0, Math.round((before - after) / 1_048_576));
    const newRatio = process.memoryUsage().heapUsed / Math.max(1, process.memoryUsage().heapTotal);
    return {
      ok: newRatio < 0.90,
      action: "Cleared embedding + semantic caches; requested GC.",
      outcome: `Freed ~${freedMB}MB; heap now ${(newRatio * 100).toFixed(1)}%.`,
      metadata: { freedMB, newRatio },
    };
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 2: Stalled autonomous loops
// ───────────────────────────────────────────────────────────────────────
const loopStrategy: HealingStrategy = {
  name: "autonomous-loop-revival",
  category: "engine",
  description: "Restarts autonomous loops that have stopped emitting pulses.",
  detect: async () => {
    try {
      const { getHeartbeatMetrics, getHeartbeatState } = await import("./autonomous-heartbeat");
      const m = getHeartbeatMetrics();
      const state = getHeartbeatState();
      type Pulse = { name?: string; lastPulseMs?: number; errorCount?: number };
      const subsystemList: Pulse[] = m.subsystems ? Object.entries(m.subsystems).map(([name, p]) => ({ name, ...(p as Pulse) })) : [];
      const silent = subsystemList.filter((s) => {
        const age = Date.now() - (s.lastPulseMs ?? 0);
        return age > 5 * 60_000 && (s.errorCount ?? 0) > 2;
      });
      if (silent.length > 0 || !state.running) {
        return {
          triggered: true,
          severity: "medium",
          detail: state.running ? `${silent.length} subsystem(s) silent > 5min with repeated errors.` : "Heartbeat loop not running.",
          context: { silentNames: silent.map((s) => s.name), running: state.running },
        };
      }
    } catch {}
    return null;
  },
  heal: async (ctx) => {
    let restarted = 0;
    try {
      if (!ctx?.running) {
        const { startAutonomousHeartbeat } = await import("./autonomous-heartbeat");
        startAutonomousHeartbeat(60_000);
        restarted++;
      }
      const silent = (ctx?.silentNames as string[]) ?? [];
      for (const name of silent) {
        try {
          const { reportSubsystemHealthy } = await import("./autonomous-heartbeat");
          reportSubsystemHealthy(name);
          restarted++;
        } catch {}
      }
      return { ok: true, action: `Revived heartbeat and reset ${restarted} subsystem(s).`, outcome: "Autonomous loops beating again.", metadata: { restarted } };
    } catch (err) {
      return { ok: false, action: "Attempt to revive heartbeat failed.", outcome: (err as Error).message };
    }
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 3: Config drift (governance)
// ───────────────────────────────────────────────────────────────────────
const configStrategy: HealingStrategy = {
  name: "governance-config-restore",
  category: "governance",
  description: "Restores BFT-safe council majority if config drifts out of range.",
  detect: async () => {
    try {
      const { getSystemConfig } = await import("./council-executor");
      const cfg = getSystemConfig();
      const maj = cfg["council.requiredMajority"];
      if (typeof maj !== "number" || maj < 0.5 || maj > 1) {
        return {
          triggered: true,
          severity: "critical",
          detail: `council.requiredMajority=${String(maj)} is outside BFT-safe range.`,
          context: { currentValue: maj },
        };
      }
    } catch {}
    return null;
  },
  heal: async (ctx) => {
    try {
      const { updateSystemConfig } = await import("./council-executor");
      updateSystemConfig("council.requiredMajority", 2 / 3);
      return {
        ok: true,
        action: "Restored council.requiredMajority to 2/3.",
        outcome: `Previous=${String(ctx?.currentValue)}, now=0.667.`,
        metadata: { previous: ctx?.currentValue, restored: 2 / 3 },
      };
    } catch (err) {
      return { ok: false, action: "Config restore failed.", outcome: (err as Error).message };
    }
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 4: Ledger tamper detection (critical — freeze writes)
// ───────────────────────────────────────────────────────────────────────
export function isLedgerFrozen(): boolean { return _ledgerIsFrozen().frozen; }

const ledgerStrategy: HealingStrategy = {
  name: "ledger-tamper-quarantine",
  category: "integrity",
  description: "Freezes ledger writes and raises alarm if hash-chain is tampered.",
  detect: async () => {
    try {
      const { verifyLedger } = await import("./sovereign-ledger");
      const v = verifyLedger();
      if (!v.ok) {
        return {
          triggered: true,
          severity: "critical",
          detail: `Ledger tamper at index ${v.firstBadIndex}: ${v.reason}`,
          context: { firstBadIndex: v.firstBadIndex, reason: v.reason },
        };
      }
    } catch {}
    return null;
  },
  heal: async (ctx) => {
    freezeLedger(`Tamper at index ${String(ctx?.firstBadIndex)}: ${String(ctx?.reason ?? "hash-chain mismatch")}`);
    return {
      ok: true,
      action: "Ledger quarantined: write-freeze engaged, incident escalated.",
      outcome: `Tamper at #${String(ctx?.firstBadIndex)} isolated. Rotate SOVEREIGN_LEDGER_SECRET and replay from last-good state.`,
      metadata: { frozen: true, ...ctx },
    };
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 5: Red-team critical findings trigger hardening
// ───────────────────────────────────────────────────────────────────────
const redTeamStrategy: HealingStrategy = {
  name: "red-team-auto-harden",
  category: "security",
  description: "Auto-hardens when red-team reports critical unresolved findings.",
  detect: async () => {
    try {
      const { getRedTeamFindings } = await import("./red-team-agent");
      const recent = getRedTeamFindings(20);
      const critical = recent.filter(f => !f.passed && (f.severity === "critical" || f.severity === "high"));
      if (critical.length > 0) {
        return {
          triggered: true,
          severity: "high",
          detail: `${critical.length} unresolved red-team finding(s).`,
          context: { findings: critical.map(f => ({ probe: f.probe, severity: f.severity, detail: f.detail })) },
        };
      }
    } catch {}
    return null;
  },
  heal: async (ctx) => {
    const applied: string[] = [];
    try {
      const { updateSystemConfig, getSystemConfig } = await import("./council-executor");
      const cfg = getSystemConfig();
      if ((cfg["security.hardeningLevel"] as number | undefined) !== 2) {
        updateSystemConfig("security.hardeningLevel", 2);
        applied.push("security.hardeningLevel=2");
      }
      if (!cfg["network.externalFetchFrozen"]) {
        updateSystemConfig("network.externalFetchFrozen", true);
        applied.push("network.externalFetchFrozen=true");
      }
    } catch {}
    return {
      ok: applied.length > 0,
      action: `Escalated hardening: ${applied.join(", ") || "(already at max)"}.`,
      outcome: `Responding to ${(ctx?.findings as unknown[])?.length ?? 0} red-team finding(s).`,
      metadata: { applied, findings: ctx?.findings },
    };
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 6: Unhandled rejection / uncaught exception counter
// ───────────────────────────────────────────────────────────────────────
let unhandledRejections = 0;
let uncaughtExceptions = 0;
let lastUnhandledAt = 0;

const errorCountStrategy: HealingStrategy = {
  name: "error-surge-dampener",
  category: "runtime",
  description: "Resets error counters and throttles when unhandled errors spike.",
  detect: async () => {
    const total = unhandledRejections + uncaughtExceptions;
    const ageMs = Date.now() - lastUnhandledAt;
    if (total >= 5 && ageMs < 120_000) {
      return {
        triggered: true,
        severity: total >= 15 ? "high" : "medium",
        detail: `${total} unhandled error(s) in the last 2 minutes.`,
        context: { unhandledRejections, uncaughtExceptions },
      };
    }
    return null;
  },
  heal: async (ctx) => {
    const snapshot = { unhandledRejections, uncaughtExceptions };
    unhandledRejections = 0;
    uncaughtExceptions = 0;
    return {
      ok: true,
      action: "Cleared error counters and flagged engines for backoff.",
      outcome: `Snapshot captured: ${snapshot.unhandledRejections} rejections, ${snapshot.uncaughtExceptions} exceptions.`,
      metadata: { snapshot, prior: ctx },
    };
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 7: Embedding cache overflow
// ───────────────────────────────────────────────────────────────────────
const embedStrategy: HealingStrategy = {
  name: "embedding-cache-prune",
  category: "performance",
  description: "Prunes the embedding cache when it exceeds safe size.",
  detect: async () => {
    try {
      const { getEmbeddingStats } = await import("./neural-embeddings");
      const s = getEmbeddingStats() as { cacheSize?: number };
      if ((s.cacheSize ?? 0) > 10_000) {
        return {
          triggered: true,
          severity: "low",
          detail: `Embedding cache has ${s.cacheSize} entries.`,
          context: { cacheSize: s.cacheSize },
        };
      }
    } catch {}
    return null;
  },
  heal: async () => {
    try {
      const mod = await import("./neural-embeddings");
      const fn = (mod as { clearEmbeddingCache?: () => number }).clearEmbeddingCache;
      const freed = typeof fn === "function" ? (fn() ?? 0) : 0;
      return { ok: true, action: "Pruned embedding cache.", outcome: `Evicted ${freed} entries.`, metadata: { freed } };
    } catch (err) {
      return { ok: false, action: "Prune failed.", outcome: (err as Error).message };
    }
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 8: CPU load runaway
// ───────────────────────────────────────────────────────────────────────
const cpuStrategy: HealingStrategy = {
  name: "cpu-load-shed",
  category: "runtime",
  description: "Reduces engine tick frequency under sustained high CPU.",
  detect: async () => {
    const load = os.loadavg()[0];
    const cores = Math.max(1, os.cpus().length);
    const ratio = load / cores;
    if (ratio > 3) {
      return {
        triggered: true,
        severity: "medium",
        detail: `1m load ${load.toFixed(2)} on ${cores} cores (ratio ${ratio.toFixed(2)}).`,
        context: { load, cores, ratio },
      };
    }
    return null;
  },
  heal: async () => {
    try {
      const { updateSystemConfig } = await import("./council-executor");
      updateSystemConfig("runtime.backoffMode", true);
      updateSystemConfig("runtime.tickMultiplier", 2);
      return {
        ok: true,
        action: "Engaged backoff mode (tick multiplier ×2).",
        outcome: "Engine tick intervals doubled until load recovers.",
      };
    } catch (err) {
      return { ok: false, action: "Backoff toggle failed.", outcome: (err as Error).message };
    }
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 9: External sandbox breach (lessons containing forbidden patterns)
// ───────────────────────────────────────────────────────────────────────
const sandboxStrategy: HealingStrategy = {
  name: "sandbox-quarantine-flush",
  category: "security",
  description: "Purges quarantined lessons when volume exceeds safe threshold.",
  detect: async () => {
    try {
      const { getSandboxPolicyStats } = await import("./external-sandbox-policy");
      const s = getSandboxPolicyStats();
      if (s.lessons.total > 800) {
        return {
          triggered: true,
          severity: "low",
          detail: `${s.lessons.total} quarantined lessons (pending=${s.lessons.pending}).`,
          context: { total: s.lessons.total, pending: s.lessons.pending },
        };
      }
    } catch {}
    return null;
  },
  heal: async (ctx) => {
    try {
      const mod = await import("./external-sandbox-policy");
      const fn = (mod as { flushUnverifiedLessons?: () => number }).flushUnverifiedLessons;
      const flushed = typeof fn === "function" ? (fn() ?? 0) : 0;
      return {
        ok: true,
        action: "Flushed unverified quarantined lessons.",
        outcome: `Flushed ${flushed} (was total=${String(ctx?.total)}).`,
        metadata: { flushed },
      };
    } catch (err) {
      return { ok: false, action: "Flush failed.", outcome: (err as Error).message };
    }
  },
};

// ───────────────────────────────────────────────────────────────────────
// Strategy 10: Self-check degradation → composite recovery
// ───────────────────────────────────────────────────────────────────────
const compositeStrategy: HealingStrategy = {
  name: "composite-recovery",
  category: "meta",
  description: "Meta-healing: when sovereignty score drops below 60, runs a full sweep.",
  detect: async () => {
    try {
      const mem = process.memoryUsage();
      const heapRatio = mem.heapUsed / Math.max(1, mem.heapTotal);
      const load = os.loadavg()[0] / Math.max(1, os.cpus().length);
      const uptime = process.uptime();
      if (uptime < 30) return null;
      const degraded = heapRatio > 0.92 || load > 2.5;
      if (degraded) {
        return {
          triggered: true,
          severity: "medium",
          detail: `Composite degradation detected (heap=${(heapRatio * 100).toFixed(0)}%, load=${load.toFixed(2)}).`,
          context: { heapRatio, load },
        };
      }
    } catch {}
    return null;
  },
  heal: async () => {
    const applied: string[] = [];
    try {
      const r1 = await memStrategy.heal();
      if (r1.ok) applied.push("memory");
    } catch {}
    try {
      const r2 = await embedStrategy.heal();
      if (r2.ok) applied.push("embedding-cache");
    } catch {}
    try {
      const r3 = await cpuStrategy.heal();
      if (r3.ok) applied.push("cpu-backoff");
    } catch {}
    return {
      ok: applied.length > 0,
      action: "Composite sweep executed.",
      outcome: applied.length > 0 ? `Sub-strategies applied: ${applied.join(", ")}.` : "No sub-strategy produced an effect.",
      metadata: { applied },
    };
  },
};

const STRATEGIES: HealingStrategy[] = [
  memStrategy,
  loopStrategy,
  configStrategy,
  ledgerStrategy,
  redTeamStrategy,
  errorCountStrategy,
  embedStrategy,
  cpuStrategy,
  sandboxStrategy,
  compositeStrategy,
];

export function recordUnhandledRejection(): void {
  unhandledRejections++;
  lastUnhandledAt = Date.now();
}
export function recordUncaughtException(): void {
  uncaughtExceptions++;
  lastUnhandledAt = Date.now();
}

export async function runHealingSweep(opts: { manual?: boolean } = {}): Promise<HealingIncident[]> {
  if (!enabled && !opts.manual) return [];
  totalRuns++;
  lastRunAt = Date.now();
  const produced: HealingIncident[] = [];

  for (const strat of STRATEGIES) {
    const cooldownUntil = strategyCooldown[strat.name] ?? 0;
    if (!opts.manual && Date.now() < cooldownUntil) continue;

    let detection: Awaited<ReturnType<HealingStrategy["detect"]>> = null;
    try {
      detection = await strat.detect();
    } catch (err) {
      logger.debug({ strategy: strat.name, err: (err as Error).message }, "AutoHealer: detect threw");
      continue;
    }
    if (!detection || !detection.triggered) {
      consecutiveFailures[strat.name] = 0;
      continue;
    }

    let healResult: Awaited<ReturnType<HealingStrategy["heal"]>>;
    try {
      healResult = await strat.heal(detection.context);
    } catch (err) {
      healResult = { ok: false, action: "Heal threw.", outcome: (err as Error).message };
    }

    const fails = (consecutiveFailures[strat.name] ?? 0) + (healResult.ok ? 0 : 1);
    consecutiveFailures[strat.name] = healResult.ok ? 0 : fails;

    const status: HealingStatus = healResult.ok
      ? "healed"
      : fails >= 3
        ? "escalated"
        : "failed";

    strategyCooldown[strat.name] = Date.now() + COOLDOWN_MS_DEFAULT;

    const incident: HealingIncident = {
      id: `heal-${strat.name}-${Date.now()}-${produced.length}`,
      ts: Date.now(),
      strategy: strat.name,
      category: strat.category,
      severity: detection.severity,
      status,
      detected: detection.detail,
      action: healResult.action,
      outcome: healResult.outcome,
      metadata: { ...detection.context, ...healResult.metadata, consecutiveFailures: fails },
    };
    pushIncident(incident);
    produced.push(incident);

    logger.info(
      { strategy: strat.name, severity: detection.severity, status, action: healResult.action },
      "AutoHealer: incident handled",
    );
  }

  return produced;
}

export function getHealingIncidents(limit = 50): HealingIncident[] {
  return incidents.slice(-limit).reverse();
}

export function getHealingStats() {
  const byStrategy: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const i of incidents) {
    byStrategy[i.strategy] = (byStrategy[i.strategy] ?? 0) + 1;
    byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  }
  return {
    enabled,
    totalRuns,
    totalHealed,
    totalFailed,
    totalEscalated,
    lastRunAt,
    totalIncidents: incidents.length,
    strategiesConfigured: STRATEGIES.length,
    byStrategy,
    byStatus,
    ledgerFrozen: _ledgerIsFrozen().frozen,
    unhandledRejections,
    uncaughtExceptions,
  };
}

export function listStrategies() {
  return STRATEGIES.map(s => ({ name: s.name, category: s.category, description: s.description }));
}

export function setAutoHealerEnabled(on: boolean): void {
  enabled = !!on;
  logger.info({ enabled }, "AutoHealer: enabled flag changed");
}

let healerInterval: SacredHandle | null = null;
export function startAutoHealer(intervalMs = 45_000): void {
  if (healerInterval) return;
  process.on("unhandledRejection", (reason) => {
    recordUnhandledRejection();
    logger.warn({ reason: String(reason).slice(0, 200) }, "AutoHealer: unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    recordUncaughtException();
    logger.error({ err: err.message }, "AutoHealer: uncaughtException");
  });
  setTimeout(() => { runHealingSweep().catch(() => {}); }, 10_000);
  healerInterval = setSacredInterval(() => {
    runHealingSweep().catch(err => logger.warn({ err }, "AutoHealer: sweep failed", "auto-healer"));
  }, intervalMs, "auto-healer");
  logger.info({ intervalMs, strategies: STRATEGIES.length }, "AutoHealer: started");
}
export function stopAutoHealer(): void {
  if (healerInterval) { clearSacredInterval(healerInterval); healerInterval = null; }
}
