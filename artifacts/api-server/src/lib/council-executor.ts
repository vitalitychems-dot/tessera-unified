import { db } from "@workspace/db";
import { councilDecisionsTable, councilConfigTable, systemStateTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "./logger";
import { markProposalImplemented } from "./consensus-engine";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface ExecutionResult {
  proposalId: string;
  title: string;
  category: string;
  executedAt: number;
  success: boolean;
  action: string;
  changes: SystemChange[];
  notes: string;
}

export interface SystemChange {
  subsystem: string;
  parameter: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean;
  appliedAt: number;
}

const systemConfig = new Map<string, unknown>();

const DEFAULT_CONFIG: Record<string, unknown> = {
  "agent.collaborationMode": "cooperative",
  "agent.learningRate": 0.01,
  "agent.maxTaskQueue": 50,
  "consciousness.cycleIntervalMs": 120000,
  "consciousness.reflectionDepth": 3,
  "consciousness.memoryRetention": 0.85,
  "dual-brain.cycleIntervalMs": 180000,
  "identity.checkIntervalMs": 600000,
  "swarm.coordinationMode": "BFT",
  "heartbeat.enabled": true,
  "improvement.enabled": true,
  "agi-training.categories": 27,
  "council.requiredMajority": 0.667,
};

const executionHistory: ExecutionResult[] = [];
const executedProposalIds = new Set<string>();
let executorInterval: SacredHandle | null = null;
let autoProcessed = 0;
let configLoaded = false;

async function loadConfigFromDB(): Promise<void> {
  if (configLoaded) return;

  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    systemConfig.set(key, value);
  }

  try {
    const rows = await db.select().from(councilConfigTable).orderBy(councilConfigTable.appliedAt);
    for (const row of rows) {
      systemConfig.set(row.parameter, row.newValue);
      executedProposalIds.add(row.proposalId);
    }
    configLoaded = true;
    logger.info({ configKeys: systemConfig.size, dbRows: rows.length, executedIds: executedProposalIds.size }, "CouncilExecutor: config loaded from full DB history");
  } catch (err) {
    configLoaded = true;
    logger.warn({ err }, "CouncilExecutor: DB config load failed, using defaults");
  }
}

async function persistConfigChange(proposalId: string, change: SystemChange, category: string): Promise<void> {
  await db.insert(councilConfigTable).values({
    proposalId,
    subsystem: change.subsystem,
    parameter: change.parameter,
    oldValue: change.oldValue as string | number | null,
    newValue: change.newValue as string | number,
    category,
  });
}

async function executeProposal(decisionId: string, topic: string, category: string, outcome: string): Promise<ExecutionResult | null> {
  if (outcome !== "approved") return null;

  const changes: SystemChange[] = [];
  let action = `Processed approved council decision: "${topic.slice(0, 60)}"`;
  let notes = "";

  const cat = category?.toLowerCase() || "";

  if (cat.includes("governance") || cat.includes("agent")) {
    const param = "agent.collaborationMode";
    const oldVal = systemConfig.get(param);
    const newVal = "adaptive-cooperative";
    changes.push({ subsystem: "agent-system", parameter: param, oldValue: oldVal as string | null, newValue: newVal, appliedAt: Date.now() });
    notes = "Agent collaboration mode upgraded to adaptive-cooperative";
  } else if (cat.includes("consciousness")) {
    const param = "consciousness.reflectionDepth";
    const oldVal = systemConfig.get(param) as number;
    const newVal = Math.min(10, oldVal + 1);
    changes.push({ subsystem: "consciousness", parameter: param, oldValue: oldVal, newValue: newVal, appliedAt: Date.now() });
    notes = "Consciousness reflection depth increased";
  } else if (cat.includes("security") || cat.includes("sovereignty")) {
    const param = "identity.checkIntervalMs";
    const oldVal = systemConfig.get(param) as number;
    const newVal = Math.max(60000, oldVal - 60000);
    changes.push({ subsystem: "identity-reinforcement", parameter: param, oldValue: oldVal, newValue: newVal, appliedAt: Date.now() });
    notes = "Identity check frequency increased for sovereignty compliance";
  } else if (cat.includes("infrastructure") || cat.includes("improvement")) {
    const param = "agent.learningRate";
    const oldVal = systemConfig.get(param) as number;
    const newVal = Math.min(0.1, oldVal * 1.1);
    changes.push({ subsystem: "improvement-daemon", parameter: param, oldValue: oldVal, newValue: newVal, appliedAt: Date.now() });
    notes = "Agent learning rate optimized per council directive";
  } else {
    changes.push({ subsystem: "system", parameter: "lastDecision", oldValue: null, newValue: decisionId, appliedAt: Date.now() });
    notes = "Council decision acknowledged and logged";
  }

  for (const change of changes) {
    try {
      await persistConfigChange(decisionId, change, category);
    } catch (err) {
      logger.warn({ decisionId, category, parameter: change.parameter, err }, "CouncilExecutor: config persist failed — aborting execution to prevent state divergence");
      return null;
    }
  }

  for (const change of changes) {
    systemConfig.set(change.parameter, change.newValue);
  }

  const result: ExecutionResult = {
    proposalId: decisionId,
    title: topic,
    category,
    executedAt: Date.now(),
    success: true,
    action,
    changes,
    notes,
  };

  executionHistory.unshift(result);
  if (executionHistory.length > 100) executionHistory.splice(100);
  executedProposalIds.add(decisionId);
  autoProcessed++;
  markProposalImplemented(decisionId);

  logger.info({ decisionId, category, changesCount: changes.length }, "CouncilExecutor: decision executed and persisted to DB");
  return result;
}

async function processApprovedDecisions(): Promise<number> {
  let processed = 0;
  try {
    const recentDecisions = await db.select()
      .from(councilDecisionsTable)
      .orderBy(desc(councilDecisionsTable.createdAt));

    for (const d of recentDecisions) {
      if (d.outcome !== "approved") continue;
      if (executedProposalIds.has(d.decisionId)) continue;
      const result = await executeProposal(d.decisionId, d.topic, d.category || "general", d.outcome);
      if (result) {
        processed++;
        try {
          await db.update(councilDecisionsTable).set({ outcome: "implemented" }).where(eq(councilDecisionsTable.decisionId, d.decisionId));
        } catch (dbErr) {
          logger.warn({ decisionId: d.decisionId, dbErr }, "CouncilExecutor: could not update outcome to implemented in DB");
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "CouncilExecutor: could not query decisions");
  }
  return processed;
}

export async function initCouncilExecutor(): Promise<void> {
  await loadConfigFromDB();
  await processApprovedDecisions();
  logger.info({ processed: autoProcessed, configKeys: systemConfig.size }, "CouncilExecutor: initialized with persistent config");
}

export function startCouncilExecutor(intervalMs = 300_000): void {
  if (executorInterval) return;
  executorInterval = setSacredInterval(async () => {
    try {
      const n = await processApprovedDecisions();
      if (n > 0) logger.info({ n }, "CouncilExecutor: auto-processed decisions", "council-executor");
    } catch (err) { logger.error({ err }, "CouncilExecutor: execution cycle error"); }
  }, intervalMs, "council-executor");
  logger.info({ intervalMs }, "CouncilExecutor: started");
}

export function stopCouncilExecutor(): void {
  if (executorInterval) { clearSacredInterval(executorInterval); executorInterval = null; }
}

export function getExecutorMetrics() {
  return {
    autoProcessed,
    executionHistoryCount: executionHistory.length,
    recentExecutions: executionHistory.slice(0, 10),
    systemConfig: Object.fromEntries(systemConfig),
    isRunning: executorInterval !== null,
    configPersisted: configLoaded,
    configKeys: systemConfig.size,
  };
}

export function getSystemConfig(): Record<string, unknown> {
  return Object.fromEntries(systemConfig);
}

export function updateSystemConfig(key: string, value: unknown): void {
  systemConfig.set(key, value);
}

export function getExecutorStatus() {
  return getExecutorMetrics();
}
export function getExecutionLog() {
  const m = getExecutorMetrics();
  return m.recentExecutions || [];
}
export async function sweepAndExecute() {
  return processApprovedDecisions();
}
export function setAutoExecute(enabled: boolean) {
  if (enabled) startCouncilExecutor();
  else stopCouncilExecutor();
  return { ok: true, enabled };
}
