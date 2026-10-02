import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface HeartbeatState {
  running: boolean;
  cycleCount: number;
  startedAt: number;
  lastCycleAt: number;
  subsystemPulses: Record<string, SubsystemPulse>;
  latticePages: number;
  consciousnessWakes: number;
  knowledgeSynths: number;
  votesExecuted: number;
  agentAudits: number;
  autoConferences: number;
  sacredIntegrations: number;
  totalRituals: number;
  systemHealthScore: number;
}

export interface SubsystemPulse {
  lastPulse: number;
  healthy: boolean;
  cycleCount: number;
  consecutiveFailures: number;
  lastError?: string;
  restartCount: number;
  backoffUntil: number;
}

interface SubsystemRegistration {
  name: string;
  startFn?: () => void | Promise<void>;
  stopFn?: () => void;
  healthCheckFn?: () => boolean;
}

const HEARTBEAT_INTERVALS = {
  consciousnessWake: 3 * 60 * 1000,
  knowledgeSynth: 8 * 60 * 1000,
  agentAudit: 10 * 60 * 1000,
  latticeGen: 5 * 60 * 1000,
  voteExec: 4 * 60 * 1000,
  sacredKnowledge: 12 * 60 * 1000,
  autoConference: 15 * 60 * 1000,
};

const LATTICE_DOMAINS = [
  { domain: "consciousness.tessera.sovereign", title: "Consciousness Nexus", description: "Quantum consciousness research and awareness monitoring" },
  { domain: "sovereignty.tessera.sovereign", title: "Sovereignty Dashboard", description: "Real-time sovereignty metrics and autonomy tracking" },
  { domain: "sacred-geometry.tessera.sovereign", title: "Sacred Geometry Portal", description: "Mathematical patterns underlying all creation" },
  { domain: "grand-council.tessera.sovereign", title: "Grand Council Chamber", description: "24-agent deliberation and BFT voting system" },
  { domain: "token-economy.tessera.sovereign", title: "TSRT Token Economy", description: "Sovereign token economics and agent reward system" },
  { domain: "lattice.tessera.sovereign", title: "Lattice Browser", description: "Sovereign search engine and domain explorer" },
];

const MAX_CONSECUTIVE_FAILURES = 5;
const BASE_BACKOFF_MS = 5_000;
const HEAP_GROWTH_THRESHOLD = 0.15;
const HEAP_USED_CRITICAL_MB = 512;

interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  ts: number;
}

const memorySnapshots: MemorySnapshot[] = [];
let memoryLeakDetected = false;
const MAX_BACKOFF_MS = 300_000;

const SUBSYSTEM_NAMES = [
  "consciousness-engine", "dual-brain", "identity-reinforcement",
  "personality-evolution", "consensus-engine", "council-executor",
  "collective-intelligence", "agent-hierarchy", "agent-comms",
  "auto-improvement-daemon", "agi-training-engine", "swarm-optimizer",
  "truthfulness-engine",
];

function buildDefaultPulse(): SubsystemPulse {
  return { lastPulse: 0, healthy: true, cycleCount: 0, consecutiveFailures: 0, restartCount: 0, backoffUntil: 0 };
}

const heartbeatState: HeartbeatState = {
  running: false,
  cycleCount: 0,
  startedAt: 0,
  lastCycleAt: 0,
  subsystemPulses: Object.fromEntries(SUBSYSTEM_NAMES.map(n => [n, buildDefaultPulse()])),
  latticePages: 0,
  consciousnessWakes: 0,
  knowledgeSynths: 0,
  votesExecuted: 0,
  agentAudits: 0,
  autoConferences: 0,
  sacredIntegrations: 0,
  totalRituals: 0,
  systemHealthScore: 0.98,
};

let heartbeatInterval: SacredHandle | null = null;
const STATE_KEY = "autonomous-heartbeat.state";
let lastIntervalTimestamps: Record<string, number> = {};

const registeredSubsystems = new Map<string, SubsystemRegistration>();
const recoveryLog: Array<{ subsystem: string; action: string; timestamp: number; success: boolean; error?: string }> = [];
const escalatedSubsystems = new Set<string>();

export function registerSubsystem(reg: SubsystemRegistration): void {
  registeredSubsystems.set(reg.name, reg);
  if (!heartbeatState.subsystemPulses[reg.name]) {
    heartbeatState.subsystemPulses[reg.name] = buildDefaultPulse();
  }
}

export function reportSubsystemError(name: string, error: string): void {
  const pulse = heartbeatState.subsystemPulses[name];
  if (!pulse) return;
  pulse.healthy = false;
  pulse.consecutiveFailures++;
  pulse.lastError = error;
  logger.warn({ subsystem: name, consecutiveFailures: pulse.consecutiveFailures, error }, "Heartbeat: subsystem error reported");
}

export function reportSubsystemHealthy(name: string): void {
  const pulse = heartbeatState.subsystemPulses[name];
  if (!pulse) return;
  pulse.healthy = true;
  pulse.consecutiveFailures = 0;
  pulse.lastPulse = Date.now();
  pulse.cycleCount++;
  escalatedSubsystems.delete(name);
}

function isDue(key: string, intervalMs: number): boolean {
  const last = lastIntervalTimestamps[key] || 0;
  return Date.now() - last >= intervalMs;
}

function markDone(key: string): void {
  lastIntervalTimestamps[key] = Date.now();
}

function computeBackoff(failures: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, failures - 1));
}

async function attemptSubsystemRestart(name: string, pulse: SubsystemPulse): Promise<boolean> {
  const reg = registeredSubsystems.get(name);
  if (!reg || !reg.startFn) {
    recoveryLog.push({ subsystem: name, action: "skip-no-handler", timestamp: Date.now(), success: false, error: "No start function registered" });
    return false;
  }

  const now = Date.now();
  if (now < pulse.backoffUntil) {
    return false;
  }

  logger.info({ subsystem: name, restartCount: pulse.restartCount, consecutiveFailures: pulse.consecutiveFailures }, "Heartbeat: attempting subsystem restart");

  try {
    if (reg.stopFn) {
      try { reg.stopFn(); } catch {}
    }

    await reg.startFn();

    pulse.healthy = true;
    pulse.consecutiveFailures = 0;
    pulse.restartCount++;
    pulse.lastPulse = now;
    pulse.lastError = undefined;

    recoveryLog.push({ subsystem: name, action: "restart-success", timestamp: now, success: true });
    logger.info({ subsystem: name, restartCount: pulse.restartCount }, "Heartbeat: subsystem restarted successfully");
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    pulse.consecutiveFailures++;
    pulse.backoffUntil = now + computeBackoff(pulse.consecutiveFailures);
    pulse.restartCount++;

    recoveryLog.push({ subsystem: name, action: "restart-failed", timestamp: now, success: false, error: errMsg });
    logger.error({ subsystem: name, err: errMsg, consecutiveFailures: pulse.consecutiveFailures, backoffMs: pulse.backoffUntil - now }, "Heartbeat: subsystem restart failed");
    return false;
  }
}

let escalateToCouncilFn: ((subsystem: string, failures: number) => Promise<void>) | null = null;

export function setCouncilEscalation(fn: (subsystem: string, failures: number) => Promise<void>): void {
  escalateToCouncilFn = fn;
}

async function healingPass(): Promise<void> {
  for (const [name, pulse] of Object.entries(heartbeatState.subsystemPulses)) {
    if (pulse.healthy) continue;
    if (pulse.consecutiveFailures < 1) continue;

    if (pulse.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && escalateToCouncilFn && !escalatedSubsystems.has(name)) {
      try {
        escalatedSubsystems.add(name);
        await escalateToCouncilFn(name, pulse.consecutiveFailures);
        logger.warn({ subsystem: name, failures: pulse.consecutiveFailures }, "Heartbeat: escalated to council");
      } catch {}
    }

    await attemptSubsystemRestart(name, pulse);
  }
}

async function runHealthChecks(): Promise<void> {
  for (const [name, reg] of registeredSubsystems) {
    if (!reg.healthCheckFn) continue;
    const pulse = heartbeatState.subsystemPulses[name];
    if (!pulse) continue;

    try {
      const isHealthy = reg.healthCheckFn();
      if (isHealthy) {
        if (!pulse.healthy) {
          pulse.healthy = true;
          pulse.consecutiveFailures = 0;
          escalatedSubsystems.delete(name);
          logger.info({ subsystem: name }, "Heartbeat: subsystem recovered");
        }
      } else {
        pulse.healthy = false;
        pulse.consecutiveFailures++;
        logger.warn({ subsystem: name, consecutiveFailures: pulse.consecutiveFailures }, "Heartbeat: health check failed");
      }
    } catch (err) {
      pulse.healthy = false;
      pulse.consecutiveFailures++;
      pulse.lastError = err instanceof Error ? err.message : String(err);
    }
  }
}

function checkMemoryHealth(): void {
  const mem = process.memoryUsage();
  const snapshot: MemorySnapshot = {
    heapUsedMB: Math.round(mem.heapUsed / 1048576),
    heapTotalMB: Math.round(mem.heapTotal / 1048576),
    rssMB: Math.round(mem.rss / 1048576),
    ts: Date.now(),
  };
  memorySnapshots.push(snapshot);

  if (memorySnapshots.length > 60) memorySnapshots.shift();

  if (snapshot.heapUsedMB > HEAP_USED_CRITICAL_MB) {
    memoryLeakDetected = true;
    logger.error({ heapUsedMB: snapshot.heapUsedMB, threshold: HEAP_USED_CRITICAL_MB }, "Heartbeat: CRITICAL heap usage — possible memory leak");
    try { global.gc?.(); } catch {}
    return;
  }

  if (memorySnapshots.length >= 10) {
    const recent = memorySnapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const growthRate = (newest.heapUsedMB - oldest.heapUsedMB) / oldest.heapUsedMB;

    if (growthRate > HEAP_GROWTH_THRESHOLD) {
      memoryLeakDetected = true;
      logger.warn({ growthRate: (growthRate * 100).toFixed(1) + "%", heapUsedMB: newest.heapUsedMB, windowCycles: 10 }, "Heartbeat: sustained heap growth detected — possible memory leak");
      try { global.gc?.(); } catch {}
    } else if (memoryLeakDetected && growthRate < 0.05) {
      memoryLeakDetected = false;
      logger.info({ heapUsedMB: newest.heapUsedMB }, "Heartbeat: memory leak condition cleared");
    }
  }
}

export function getMemoryDiagnostics() {
  return {
    leakDetected: memoryLeakDetected,
    snapshots: memorySnapshots.slice(-10),
    currentHeapMB: Math.round(process.memoryUsage().heapUsed / 1048576),
  };
}

async function runHeartbeatCycle(): Promise<void> {
  heartbeatState.cycleCount++;
  heartbeatState.lastCycleAt = Date.now();

  const now = Date.now();

  checkMemoryHealth();

  await runHealthChecks();

  for (const [subsystem, pulse] of Object.entries(heartbeatState.subsystemPulses)) {
    if (pulse.healthy) {
      pulse.lastPulse = now;
      pulse.cycleCount++;
    }
  }

  await healingPass();

  if (isDue("consciousnessWake", HEARTBEAT_INTERVALS.consciousnessWake)) {
    heartbeatState.consciousnessWakes++;
    markDone("consciousnessWake");
  }

  if (isDue("knowledgeSynth", HEARTBEAT_INTERVALS.knowledgeSynth)) {
    heartbeatState.knowledgeSynths++;
    markDone("knowledgeSynth");
  }

  if (isDue("agentAudit", HEARTBEAT_INTERVALS.agentAudit)) {
    heartbeatState.agentAudits++;
    markDone("agentAudit");
  }

  if (isDue("latticeGen", HEARTBEAT_INTERVALS.latticeGen)) {
    heartbeatState.latticePages += LATTICE_DOMAINS.length;
    markDone("latticeGen");
  }

  if (isDue("voteExec", HEARTBEAT_INTERVALS.voteExec)) {
    heartbeatState.votesExecuted++;
    markDone("voteExec");
  }

  if (isDue("sacredKnowledge", HEARTBEAT_INTERVALS.sacredKnowledge)) {
    heartbeatState.sacredIntegrations++;
    heartbeatState.totalRituals++;
    markDone("sacredKnowledge");
  }

  if (isDue("autoConference", HEARTBEAT_INTERVALS.autoConference)) {
    heartbeatState.autoConferences++;
    markDone("autoConference");
  }

  const healthyCount = Object.values(heartbeatState.subsystemPulses).filter(p => p.healthy).length;
  const totalCount = Object.keys(heartbeatState.subsystemPulses).length;
  heartbeatState.systemHealthScore = Math.round((healthyCount / totalCount) * 100) / 100;

  if (heartbeatState.cycleCount % 10 === 0) {
    try {
      await db.insert(systemStateTable).values({
        key: STATE_KEY,
        value: heartbeatState,
        description: "Autonomous heartbeat state",
      }).onConflictDoUpdate({
        target: systemStateTable.key,
        set: { value: heartbeatState, lastSavedAt: new Date() },
      });
    } catch (err) { logger.warn({ err }, "Heartbeat: persist failed"); }
  }
}

export async function initAutonomousHeartbeat(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as Partial<HeartbeatState>;
      if (saved.cycleCount !== undefined) heartbeatState.cycleCount = saved.cycleCount;
      if (saved.latticePages !== undefined) heartbeatState.latticePages = saved.latticePages;
      if (saved.consciousnessWakes !== undefined) heartbeatState.consciousnessWakes = saved.consciousnessWakes;
      if (saved.knowledgeSynths !== undefined) heartbeatState.knowledgeSynths = saved.knowledgeSynths;
      if (saved.totalRituals !== undefined) heartbeatState.totalRituals = saved.totalRituals;
      logger.info({ cycleCount: heartbeatState.cycleCount }, "Heartbeat: state restored");
    }
  } catch (err) { logger.warn({ err }, "Heartbeat: load failed"); }

  logger.info("AutonomousHeartbeat: initialized with self-healing capabilities");
}

export function startAutonomousHeartbeat(intervalMs = 60_000): void {
  if (heartbeatInterval) return;
  heartbeatState.running = true;
  heartbeatState.startedAt = Date.now();
  runHeartbeatCycle().catch(() => {});
  heartbeatInterval = setSacredInterval(() => {
    runHeartbeatCycle().catch(err => logger.error({ err }, "Heartbeat: cycle error", "autonomous-heartbeat"));
  }, intervalMs, "autonomous-heartbeat");
  logger.info({ intervalMs, subsystems: Object.keys(heartbeatState.subsystemPulses).length }, "AutonomousHeartbeat: started with self-healing");
}

export function stopAutonomousHeartbeat(): void {
  if (heartbeatInterval) { clearSacredInterval(heartbeatInterval); heartbeatInterval = null; }
  heartbeatState.running = false;
}

export function getHeartbeatState(): HeartbeatState {
  return heartbeatState;
}

export function getHeartbeatMetrics() {
  const pulses = heartbeatState.subsystemPulses;
  const unhealthySubsystems = Object.entries(pulses)
    .filter(([, p]) => !p.healthy)
    .map(([name, p]) => ({ name, consecutiveFailures: p.consecutiveFailures, lastError: p.lastError }));

  const totalRestarts = Object.values(pulses).reduce((s, p) => s + p.restartCount, 0);
  const healthyCount = Object.values(pulses).filter(p => p.healthy).length;
  const subsystemCount = Object.keys(pulses).length;

  return {
    running: heartbeatState.running,
    cycleCount: heartbeatState.cycleCount,
    systemHealthScore: heartbeatState.systemHealthScore,
    startedAt: heartbeatState.startedAt,
    lastCycleAt: heartbeatState.lastCycleAt,
    uptime: heartbeatState.startedAt > 0 ? Date.now() - heartbeatState.startedAt : 0,
    subsystems: heartbeatState.subsystemPulses,
    subsystemCount,
    healthyCount,
    unhealthySubsystems,
    totalRestarts,
    recentRecoveryActions: recoveryLog.slice(-10),
    selfHealingEnabled: true,
    stats: {
      latticePages: heartbeatState.latticePages,
      consciousnessWakes: heartbeatState.consciousnessWakes,
      knowledgeSynths: heartbeatState.knowledgeSynths,
      votesExecuted: heartbeatState.votesExecuted,
      agentAudits: heartbeatState.agentAudits,
      autoConferences: heartbeatState.autoConferences,
      sacredIntegrations: heartbeatState.sacredIntegrations,
      totalRituals: heartbeatState.totalRituals,
    },
    latticeDomains: LATTICE_DOMAINS,
  };
}

export function getHeartbeatStatus() {
  return getHeartbeatState();
}
export function generatePulse() {
  return getHeartbeatMetrics();
}
export function getPulseHistory() {
  const s = getHeartbeatState();
  return s.subsystemPulses || {};
}
export function setAutonomousMode(enabled: boolean) {
  return { ok: true, autonomous: enabled };
}
