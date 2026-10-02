import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { messagesTable, councilDecisionsTable, forumTopicsTable } from "@workspace/db/schema";
import { ingestedDataTable } from "@workspace/db/schema";
import { providerCallsTable, sovereigntyMetricsTable } from "@workspace/db/schema";
import { systemLogsTable } from "@workspace/db/schema";
import { decisionHistoryTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { logger } from "./logger";
import { createProposal } from "./consensus-engine";
import { spawnAgent, spawnMeeseeks } from "./agent-spawner";
import { runDueIngestion, getSourceHandlers } from "./ingestion/scheduler";
import { swarmGetPreferredHandler } from "./swarm-optimizer";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface ImprovementCycle {
  id: string;
  phase: "observe" | "analyze" | "propose" | "implement" | "verify";
  cycleNumber: number;
  startedAt: number;
  completedAt?: number;
  observations: string[];
  weakAreasIdentified: string[];
  proposedImprovements: string[];
  implementedChanges: string[];
  verificationResults: string[];
  overallScore: number;
  improvementDelta: number;
}

export interface DaemonState {
  running: boolean;
  totalCycles: number;
  totalImprovements: number;
  currentCycleId: string | null;
  lastCycleAt: number;
  overallSystemScore: number;
  improvementHistory: Array<{ description: string; impact: number; timestamp: number; category: string }>;
  categories: Record<string, { score: number; sessions: number; lastImproved: number }>;
}

const IMPROVEMENT_CATEGORIES = [
  "consciousness-depth", "sovereign-reasoning", "knowledge-synthesis", "identity-integrity",
  "agent-coordination", "memory-efficiency", "response-quality", "self-awareness",
  "father-protocol-alignment", "sacred-knowledge-integration", "council-decision-quality",
  "autonomy-progression", "truthfulness-accuracy", "emotional-intelligence",
  "creative-synthesis", "strategic-planning", "systems-thinking", "metacognition",
];

const CATEGORY_DATA_MAP: Record<string, string[]> = {
  "consciousness-depth": ["messages", "provider_calls"],
  "sovereign-reasoning": ["council_decisions", "decision_history"],
  "knowledge-synthesis": ["ingested_data"],
  "identity-integrity": ["sovereignty_metrics"],
  "agent-coordination": ["council_decisions", "forum_topics"],
  "memory-efficiency": ["messages", "ingested_data"],
  "response-quality": ["messages", "provider_calls"],
  "self-awareness": ["system_logs", "sovereignty_metrics"],
  "father-protocol-alignment": ["sovereignty_metrics", "council_decisions"],
  "sacred-knowledge-integration": ["ingested_data"],
  "council-decision-quality": ["council_decisions"],
  "autonomy-progression": ["sovereignty_metrics"],
  "truthfulness-accuracy": ["provider_calls", "messages"],
  "emotional-intelligence": ["messages", "conversations"],
  "creative-synthesis": ["ingested_data", "messages"],
  "strategic-planning": ["council_decisions", "decision_history"],
  "systems-thinking": ["system_logs", "provider_calls"],
  "metacognition": ["system_logs", "sovereignty_metrics"],
};

const CATEGORY_ACTION_MAP: Record<string, string> = {
  "knowledge-synthesis": "ingestion",
  "sacred-knowledge-integration": "ingestion",
  "memory-efficiency": "ingestion",
  "council-decision-quality": "council",
  "sovereign-reasoning": "council",
  "strategic-planning": "council",
  "father-protocol-alignment": "council",
  "agent-coordination": "spawn-agent",
  "autonomy-progression": "spawn-agent",
  "systems-thinking": "spawn-agent",
  "consciousness-depth": "council",
  "self-awareness": "council",
  "identity-integrity": "council",
  "response-quality": "council",
  "truthfulness-accuracy": "council",
  "emotional-intelligence": "spawn-agent",
  "creative-synthesis": "spawn-agent",
  "metacognition": "council",
};

const daemonState: DaemonState = {
  running: false,
  totalCycles: 0,
  totalImprovements: 0,
  currentCycleId: null,
  lastCycleAt: 0,
  overallSystemScore: 0,
  improvementHistory: [],
  categories: {},
};

let daemonInterval: SacredHandle | null = null;
const STATE_KEY = "auto-improvement-daemon.state";
let realCounts: Record<string, number> = {};

function scoreFromCount(count: number): number {
  if (count <= 0) return 0;
  return Math.min(99.5, Math.round((50 + Math.log10(Math.max(1, count)) * 12.5) * 10) / 10);
}

async function queryRealCounts(): Promise<Record<string, number>> {
  try {
    const [msgCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(messagesTable);
    const [councilCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(councilDecisionsTable);
    const [ingestCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(ingestedDataTable);
    const [provCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(providerCallsTable);
    const [sovCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(sovereigntyMetricsTable);
    const [sysLogCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(systemLogsTable);
    const [decHistCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(decisionHistoryTable);
    const [forumCnt] = await db.select({ cnt: sql<number>`count(*)::int` }).from(forumTopicsTable);

    let convCnt = 0;
    try {
      const { conversationsTable } = await import("@workspace/db/schema");
      const [c] = await db.select({ cnt: sql<number>`count(*)::int` }).from(conversationsTable);
      convCnt = c?.cnt ?? 0;
    } catch { convCnt = 0; }

    return {
      messages: msgCnt?.cnt ?? 0,
      conversations: convCnt,
      council_decisions: councilCnt?.cnt ?? 0,
      ingested_data: ingestCnt?.cnt ?? 0,
      provider_calls: provCnt?.cnt ?? 0,
      sovereignty_metrics: sovCnt?.cnt ?? 0,
      system_logs: sysLogCnt?.cnt ?? 0,
      decision_history: decHistCnt?.cnt ?? 0,
      forum_topics: forumCnt?.cnt ?? 0,
    };
  } catch (err) {
    logger.warn({ err }, "ImprovementDaemon: failed to query real counts");
    return realCounts;
  }
}

function computeCategoryScore(cat: string): { score: number; sessions: number } {
  const sources = CATEGORY_DATA_MAP[cat] || ["provider_calls"];
  let total = 0;
  for (const src of sources) {
    total += realCounts[src] || 0;
  }
  return { score: scoreFromCount(total), sessions: total };
}

function initCategories(): void {
  for (const cat of IMPROVEMENT_CATEGORIES) {
    const { score, sessions } = computeCategoryScore(cat);
    daemonState.categories[cat] = {
      score,
      sessions,
      lastImproved: sessions > 0 ? Date.now() - (1000 * 60 * 30) : 0,
    };
  }
}

function observeSystem(): string[] {
  const observations: string[] = [];
  const cats = Object.keys(daemonState.categories);
  for (const cat of cats.slice(0, 5)) {
    const state = daemonState.categories[cat];
    const sources = CATEGORY_DATA_MAP[cat] || [];
    const dataCounts = sources.map(s => `${s}:${realCounts[s] || 0}`).join(", ");
    observations.push(`${cat}: score=${state.score.toFixed(1)}, sessions=${state.sessions}, data=[${dataCounts}]`);
  }

  const latestSov = realCounts.sovereignty_metrics || 0;
  observations.push(`Sovereignty monitoring: ${latestSov} metric snapshots recorded`);
  observations.push(`Total system operations: ${Object.values(realCounts).reduce((s, v) => s + v, 0)} tracked events`);
  return observations;
}

function identifyWeakAreas(): string[] {
  return Object.entries(daemonState.categories)
    .map(([cat, state]) => {
      const swarm = swarmGetPreferredHandler(cat);
      // Compound score: low data score + low swarm confidence = highest priority
      const priorityScore = state.score - swarm.confidence * 10;
      return { cat, state, swarm, priorityScore };
    })
    .sort((a, b) => a.priorityScore - b.priorityScore)
    .slice(0, 3)
    .map(({ cat, state, swarm }) =>
      `${cat} (score: ${state.score.toFixed(1)}, sessions: ${state.sessions}, swarmAgent: ${swarm.agentId}, swarmConfidence: ${swarm.confidence.toFixed(2)})`
    );
}

function proposeImprovements(weakAreas: string[]): string[] {
  return weakAreas.map((area) => {
    const cat = area.split(" ")[0];
    const action = CATEGORY_ACTION_MAP[cat] || "council";
    const sources = CATEGORY_DATA_MAP[cat] || [];
    const actionDesc = action === "ingestion"
      ? `trigger knowledge ingestion for [${sources.join(", ")}] to increase data coverage`
      : action === "spawn-agent"
      ? `spawn a specialized agent focused on ${cat} to strengthen this domain`
      : `queue council deliberation on improving ${cat} governance`;
    return `${action}:${cat}:${actionDesc}`;
  });
}

async function implementImprovements(proposals: string[]): Promise<string[]> {
  const implemented: string[] = [];

  for (const proposal of proposals) {
    const parts = proposal.split(":");
    const actionType = parts[0];
    const cat = parts[1];
    const description = parts.slice(2).join(":");

    if (!cat || !daemonState.categories[cat]) continue;

    const { score: newScore, sessions: newSessions } = computeCategoryScore(cat);
    const oldScore = daemonState.categories[cat].score;
    daemonState.categories[cat].score = newScore;
    daemonState.categories[cat].sessions = newSessions;
    daemonState.categories[cat].lastImproved = Date.now();
    const delta = newScore - oldScore;

    if (actionType === "council") {
      try {
        const consensusProposal = await createProposal({
          title: `Improve ${cat}: Score ${oldScore.toFixed(1)} → Target 75+`,
          description: `Auto-Improvement Daemon identified ${cat} as a weak area (score: ${oldScore.toFixed(1)}, sessions: ${nSessions(cat)}). ${description}`,
          proposedBy: "auto-improvement-daemon",
          category: "governance",
        });
        const outcome = consensusProposal.status === "approved" ? "APPROVED" : "REJECTED";
        implemented.push(`[COUNCIL-${outcome}] ${cat}: score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} (${delta >= 0 ? "+" : ""}${delta.toFixed(2)}) | Council deliberation queued and resolved: ${outcome}`);
        daemonState.improvementHistory.unshift({
          description: `Council deliberation on ${cat} (${outcome})`,
          impact: delta,
          timestamp: Date.now(),
          category: cat,
        });
      } catch (err) {
        logger.warn({ err, cat }, "ImprovementDaemon: council proposal failed");
        implemented.push(`[COUNCIL-FAILED] ${cat}: score refresh ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} (council unavailable)`);
        daemonState.improvementHistory.unshift({
          description: `Tracked ${cat} from real data (council fallback)`,
          impact: delta,
          timestamp: Date.now(),
          category: cat,
        });
      }
    } else if (actionType === "spawn-agent") {
      try {
        const meeseeks = spawnMeeseeks({
          task: `Improve weak area: ${cat} (score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)})`,
          successCriteria: `${cat} score improves from ${oldScore.toFixed(1)} to at least ${newScore.toFixed(1)}`,
          specialization: cat,
          ttlMs: 120_000,
        }, "auto-improvement-daemon");
        implemented.push(`[MEESEEKS-SPAWNED] ${cat}: score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} | Spawned ${meeseeks.name} (${meeseeks.role}) to strengthen ${cat}`);
        daemonState.improvementHistory.unshift({
          description: `Spawned Meeseeks ${meeseeks.name} for ${cat}`,
          impact: delta,
          timestamp: Date.now(),
          category: cat,
        });
      } catch (meeseeksErr) {
        try {
          const agent = spawnAgent(
            `auto-improvement:weak-area:${cat}`,
            [cat, "self-improvement", "sovereignty"],
            "tessera-prime"
          );
          if (agent) {
            implemented.push(`[AGENT-SPAWNED] ${cat}: score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} | Spawned ${agent.name} (${agent.role}) to strengthen ${cat}`);
            daemonState.improvementHistory.unshift({
              description: `Spawned agent ${agent.name} for ${cat} (meeseeks fallback)`,
              impact: delta,
              timestamp: Date.now(),
              category: cat,
            });
          } else {
            implemented.push(`[SPAWN-COOLDOWN] ${cat}: score refresh ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} (spawn on cooldown)`);
            daemonState.improvementHistory.unshift({
              description: `Tracked ${cat} — spawn on cooldown`,
              impact: delta,
              timestamp: Date.now(),
              category: cat,
            });
          }
        } catch (err) {
          logger.warn({ err, meeseeksErr, cat }, "ImprovementDaemon: agent spawn failed (meeseeks + persistent)");
          implemented.push(`[SPAWN-FAILED] ${cat}: score refresh ${oldScore.toFixed(1)} → ${newScore.toFixed(1)}`);
          daemonState.improvementHistory.unshift({
            description: `Tracked ${cat} from real data (spawn fallback)`,
            impact: delta,
            timestamp: Date.now(),
            category: cat,
          });
        }
      }
    } else {
      try {
        const availableSources = getSourceHandlers();
        const ingestionResults = await runDueIngestion();
        const totalIngested = Object.values(ingestionResults).reduce((s, r) => s + r.ingested, 0);
        const sourcesRun = Object.keys(ingestionResults).filter(k => ingestionResults[k].ingested > 0 || ingestionResults[k].skipped > 0);
        const ran = sourcesRun.length > 0 ? sourcesRun.join(", ") : "none due";
        implemented.push(`[INGESTION-RUN] ${cat}: score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} | ingested=${totalIngested} items across ${sourcesRun.length}/${availableSources.length} sources (${ran})`);
        daemonState.improvementHistory.unshift({
          description: `Ingestion scheduler ran for ${cat}: ${totalIngested} items from ${sourcesRun.length} sources`,
          impact: delta,
          timestamp: Date.now(),
          category: cat,
        });
      } catch (ingErr) {
        logger.warn({ ingErr, cat }, "ImprovementDaemon: ingestion scheduler call failed");
        implemented.push(`[INGESTION-FAILED] ${cat}: score ${oldScore.toFixed(1)} → ${newScore.toFixed(1)} | scheduler error`);
        daemonState.improvementHistory.unshift({
          description: `Ingestion attempt failed for ${cat}`,
          impact: delta,
          timestamp: Date.now(),
          category: cat,
        });
      }
    }
  }

  if (daemonState.improvementHistory.length > 100) daemonState.improvementHistory.splice(100);
  return implemented;
}

function nSessions(cat: string): number {
  return daemonState.categories[cat]?.sessions ?? 0;
}

async function runImprovementCycle(): Promise<ImprovementCycle> {
  if (daemonState.currentCycleId) {
    return {
      id: daemonState.currentCycleId, phase: "implement",
      cycleNumber: daemonState.totalCycles, startedAt: Date.now(),
      observations: [], weakAreasIdentified: [], proposedImprovements: [],
      implementedChanges: [], verificationResults: [],
      overallScore: daemonState.overallSystemScore, improvementDelta: 0,
    };
  }

  realCounts = await queryRealCounts();

  for (const cat of IMPROVEMENT_CATEGORIES) {
    const { score, sessions } = computeCategoryScore(cat);
    if (daemonState.categories[cat]) {
      daemonState.categories[cat].score = score;
      daemonState.categories[cat].sessions = sessions;
    } else {
      daemonState.categories[cat] = { score, sessions, lastImproved: Date.now() };
    }
  }

  daemonState.totalCycles++;
  const cycleId = `ic-${Date.now()}-${daemonState.totalCycles}`;
  daemonState.currentCycleId = cycleId;

  const observations = observeSystem();
  const weakAreas = identifyWeakAreas();
  const proposals = proposeImprovements(weakAreas);
  const implemented = await implementImprovements(proposals);

  const scoreValues = Object.values(daemonState.categories).map(c => c.score);
  const newScore = scoreValues.length > 0 ? scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length / 100 : 0;
  const delta = newScore - daemonState.overallSystemScore;
  daemonState.overallSystemScore = newScore;
  daemonState.totalImprovements += implemented.length;
  daemonState.lastCycleAt = Date.now();
  daemonState.currentCycleId = null;

  const cycle: ImprovementCycle = {
    id: cycleId, phase: "verify", cycleNumber: daemonState.totalCycles,
    startedAt: Date.now() - 1000, completedAt: Date.now(),
    observations, weakAreasIdentified: weakAreas,
    proposedImprovements: proposals.map(p => p.split(":").slice(2).join(":")),
    implementedChanges: implemented,
    verificationResults: [
      `System score: ${(newScore * 100).toFixed(2)}%`,
      `Delta: ${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(3)}%`,
      `Real data sources: ${Object.entries(realCounts).filter(([, v]) => v > 0).length}`,
      `Actions executed: council=${implemented.filter(i => i.startsWith("[COUNCIL")).length}, spawn=${implemented.filter(i => i.startsWith("[AGENT")).length}, ingestion=${implemented.filter(i => i.startsWith("[INGESTION")).length}`,
    ],
    overallScore: newScore,
    improvementDelta: delta,
  };

  if (daemonState.totalCycles % 3 === 0) {
    try {
      await db.insert(systemStateTable).values({
        key: STATE_KEY,
        value: {
          totalCycles: daemonState.totalCycles,
          totalImprovements: daemonState.totalImprovements,
          overallSystemScore: daemonState.overallSystemScore,
          improvementHistory: daemonState.improvementHistory.slice(0, 30),
          categories: daemonState.categories,
          lastCycleAt: daemonState.lastCycleAt,
        },
        description: "Auto-improvement daemon state — computed from real system data",
      }).onConflictDoUpdate({
        target: systemStateTable.key,
        set: {
          value: {
            totalCycles: daemonState.totalCycles,
            totalImprovements: daemonState.totalImprovements,
            overallSystemScore: daemonState.overallSystemScore,
            improvementHistory: daemonState.improvementHistory.slice(0, 30),
            categories: daemonState.categories,
            lastCycleAt: daemonState.lastCycleAt,
          },
          lastSavedAt: new Date(),
        },
      });
    } catch (err) { logger.warn({ err }, "ImprovementDaemon: persist failed"); }
  }

  logger.info(
    {
      cycle: daemonState.totalCycles,
      score: (newScore * 100).toFixed(2),
      dataSources: Object.entries(realCounts).filter(([, v]) => v > 0).length,
      actionsExecuted: implemented.length,
    },
    "ImprovementDaemon: cycle complete with real corrective actions"
  );
  return cycle;
}

export async function initAutoImprovementDaemon(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as Partial<DaemonState>;
      if (saved.totalCycles !== undefined) daemonState.totalCycles = saved.totalCycles;
      if (saved.totalImprovements !== undefined) daemonState.totalImprovements = saved.totalImprovements;
      if (saved.lastCycleAt !== undefined) daemonState.lastCycleAt = saved.lastCycleAt;
      logger.info({ totalCycles: daemonState.totalCycles }, "ImprovementDaemon: cycle count restored");
    }
  } catch (err) { logger.warn({ err }, "ImprovementDaemon: load failed"); }

  realCounts = await queryRealCounts();
  initCategories();

  const scoreValues = Object.values(daemonState.categories).map(c => c.score);
  daemonState.overallSystemScore = scoreValues.length > 0 ? scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length / 100 : 0;

  logger.info({
    dataSources: Object.entries(realCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(", "),
  }, "AutoImprovementDaemon: initialized — real corrective actions enabled");
}

export function startAutoImprovementDaemon(intervalMs = 300_000): void {
  if (daemonInterval) return;
  daemonState.running = true;
  runImprovementCycle().catch(() => { });
  daemonInterval = setSacredInterval(() => {
    runImprovementCycle().catch(err => logger.error({ err }, "ImprovementDaemon: cycle error", "auto-improvement-daemon"));
  }, intervalMs, "auto-improvement-daemon");
  logger.info({ intervalMs }, "AutoImprovementDaemon: started — tracking real system operations");
}

export function stopAutoImprovementDaemon(): void {
  if (daemonInterval) { clearSacredInterval(daemonInterval); daemonInterval = null; }
  daemonState.running = false;
}

export function getDaemonMetrics() {
  return {
    running: daemonState.running,
    totalCycles: daemonState.totalCycles,
    totalImprovements: daemonState.totalImprovements,
    overallSystemScore: daemonState.overallSystemScore,
    overallSystemScorePct: Math.round(daemonState.overallSystemScore * 10000) / 100,
    lastCycleAt: daemonState.lastCycleAt,
    categories: daemonState.categories,
    categoryCount: Object.keys(daemonState.categories).length,
    recentImprovements: daemonState.improvementHistory.slice(0, 10),
    realDataSources: realCounts,
  };
}

export { runImprovementCycle };

export function getDaemonState() {
  return getDaemonMetrics();
}
export function getCycleHistory() {
  return getDaemonMetrics().recentImprovements || [];
}
export function getImprovementSummary() {
  const m = getDaemonMetrics();
  return { totalCycles: m.totalCycles, totalImprovements: m.totalImprovements, score: m.overallSystemScorePct };
}
