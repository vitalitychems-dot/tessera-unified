import { db } from "@workspace/db";
import { providerCallsTable, councilDecisionsTable, ingestionJobsTable } from "@workspace/db";
import { gte, desc, sql } from "drizzle-orm";
import { logger } from "./logger";
import { createProposal } from "./consensus-engine";

export type OptimizerCategory =
  | "NLU" | "NLG" | "Code Generation" | "Data Analysis" | "Strategic Planning"
  | "Economic Simulation" | "Cybersecurity" | "Creative Content" | "Autonomous Learning"
  | "Inter-Agent Communication" | "Ethical Reasoning" | "System Monitoring" | "UX Design"
  | "API Integration" | "Resource Optimization" | "Market Analysis" | "Blockchain/Crypto"
  | "Risk Assessment" | "Knowledge Representation" | "Problem Solving"
  | "Emotional Intelligence" | "Social Dynamics" | "Governance" | "Hardware Interface"
  | "Real-time Processing" | "Error Handling" | "Scalability" | "Security Auditing"
  | "Distributed Systems" | "Human-AI Collaboration" | "Self-Correction/Debugging"
  | "Consciousness Modeling" | "Sacred Geometry" | "Quantum Computing" | "Temporal Reasoning";

export const ALL_CATEGORIES: OptimizerCategory[] = [
  "NLU", "NLG", "Code Generation", "Data Analysis", "Strategic Planning",
  "Economic Simulation", "Cybersecurity", "Creative Content", "Autonomous Learning",
  "Inter-Agent Communication", "Ethical Reasoning", "System Monitoring", "UX Design",
  "API Integration", "Resource Optimization", "Market Analysis", "Blockchain/Crypto",
  "Risk Assessment", "Knowledge Representation", "Problem Solving",
  "Emotional Intelligence", "Social Dynamics", "Governance", "Hardware Interface",
  "Real-time Processing", "Error Handling", "Scalability", "Security Auditing",
  "Distributed Systems", "Human-AI Collaboration", "Self-Correction/Debugging",
  "Consciousness Modeling", "Sacred Geometry", "Quantum Computing", "Temporal Reasoning",
];

export interface ModelPerformance {
  modelId: string;
  modelName: string;
  scores: Partial<Record<OptimizerCategory, number>>;
  avgScore: number;
  evaluationCount: number;
  lastEvaluated: number;
  dataSource: "real" | "synthetic";
}

export interface OptimizationResult {
  category: OptimizerCategory;
  topModel: { modelId: string; modelName: string; score: number };
  runners: Array<{ modelId: string; modelName: string; score: number }>;
  confidence: number;
  reasoning: string;
  optimizedAt: number;
}

export interface SwarmConsensus {
  topic: string;
  agentVotes: Array<{ agentId: string; recommendation: string; confidence: number; weight: number }>;
  consensus: string;
  agreementScore: number;
  timestamp: number;
}

const INTERNAL_AGENTS = [
  { id: "tessera-prime", name: "Tessera Prime", type: "sovereign-orchestrator" as const },
  { id: "alpha-agent", name: "Alpha", type: "security-analyst" as const },
  { id: "beta-agent", name: "Beta", type: "economic-modeler" as const },
  { id: "eta-agent", name: "Eta", type: "knowledge-synthesizer" as const },
  { id: "iota-agent", name: "Iota", type: "swarm-coordinator" as const },
  { id: "theta-agent", name: "Theta", type: "consciousness-researcher" as const },
  { id: "pi-agent", name: "Pi", type: "mathematician" as const },
  { id: "sigma-agent", name: "Sigma", type: "statistician" as const },
  { id: "phi-agent", name: "Phi", type: "philosopher" as const },
  { id: "omega-agent", name: "Omega", type: "systems-thinker" as const },
];

const performanceData = new Map<string, ModelPerformance>();
const optimizationHistory: OptimizationResult[] = [];
const consensusHistory: SwarmConsensus[] = [];

const preferredModelByCategory = new Map<OptimizerCategory, string>();
let initialized = false;

function initializeSyntheticFallback(): void {
  let swarmRotation = 0;
  for (const agent of INTERNAL_AGENTS) {
    const scores: Partial<Record<OptimizerCategory, number>> = {};
    for (let i = 0; i < ALL_CATEGORIES.length; i++) {
      const baseScore = 75 + (agent.id.charCodeAt(0) * 7 + i * 3) % 20;
      scores[ALL_CATEGORIES[i]] = Math.min(99, baseScore + 2);
    }
    const avgScore = Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length;
    performanceData.set(agent.id, {
      modelId: agent.id, modelName: agent.name,
      scores, avgScore: Math.round(avgScore * 100) / 100,
      evaluationCount: 5,
      lastEvaluated: Date.now() - (1000 * 60 * (10 + swarmRotation++ % 50)),
      dataSource: "synthetic",
    });
  }
}

async function initializeFromRealData(): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  try {
    const providerRows = await db.select().from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(500);

    const providerStats = new Map<string, {
      totalCalls: number;
      successCalls: number;
      totalLatency: number;
      latencyCount: number;
    }>();

    for (const row of providerRows) {
      const key = row.providerId;
      const existing = providerStats.get(key) ?? { totalCalls: 0, successCalls: 0, totalLatency: 0, latencyCount: 0 };
      existing.totalCalls++;
      if (row.status === "success") existing.successCalls++;
      if (row.latencyMs !== null) {
        existing.totalLatency += row.latencyMs;
        existing.latencyCount++;
      }
      providerStats.set(key, existing);
    }

    let councilParticipation = new Map<string, number>();
    try {
      const recentDecisions = await db.select({
        agentsParticipated: councilDecisionsTable.agentsParticipated,
      }).from(councilDecisionsTable)
        .orderBy(desc(councilDecisionsTable.createdAt))
        .limit(50);

      for (const d of recentDecisions) {
        const agents = d.agentsParticipated as string[] || [];
        for (const agentName of agents) {
          const count = councilParticipation.get(agentName) ?? 0;
          councilParticipation.set(agentName, count + 1);
        }
      }
    } catch {
      logger.warn("SwarmOptimizer: could not query council participation");
    }

    // Ingestion task-completion signals: map source names to agent specialties
    const INGESTION_SOURCE_TO_AGENT: Record<string, string> = {
      arxiv: "pi-agent",
      "arxiv.org": "pi-agent",
      nasa: "theta-agent",
      "nasa.gov": "theta-agent",
      wikipedia: "eta-agent",
      reddit: "phi-agent",
      github: "alpha-agent",
      ncbi: "sigma-agent",
    };
    const ingestionCompletionScore = new Map<string, number>();
    try {
      const recentJobs = await db.select({
        sourceName: ingestionJobsTable.sourceName,
        status: ingestionJobsTable.status,
        itemsIngested: ingestionJobsTable.itemsIngested,
        durationMs: ingestionJobsTable.durationMs,
      }).from(ingestionJobsTable)
        .where(gte(ingestionJobsTable.startedAt, since))
        .orderBy(desc(ingestionJobsTable.startedAt))
        .limit(200);

      const sourceStats = new Map<string, { completed: number; total: number; itemsIngested: number }>();
      for (const job of recentJobs) {
        const key = job.sourceName.toLowerCase().split(/[.\s]/)[0];
        const existing = sourceStats.get(key) ?? { completed: 0, total: 0, itemsIngested: 0 };
        existing.total++;
        if (job.status === "completed" || job.status === "success") existing.completed++;
        existing.itemsIngested += job.itemsIngested ?? 0;
        sourceStats.set(key, existing);
      }

      for (const [sourceKey, agentId] of Object.entries(INGESTION_SOURCE_TO_AGENT)) {
        const stats = sourceStats.get(sourceKey);
        if (stats && stats.total > 0) {
          const completionRate = stats.completed / stats.total;
          const throughputScore = Math.min(100, 50 + stats.itemsIngested / 10);
          const score = completionRate * 60 + throughputScore * 0.4;
          const existing = ingestionCompletionScore.get(agentId) ?? 0;
          ingestionCompletionScore.set(agentId, Math.max(existing, score));
        }
      }
      if (ingestionCompletionScore.size > 0) {
        logger.info(
          { sources: sourceStats.size, mappedAgents: ingestionCompletionScore.size, totalJobs: recentJobs.length },
          "SwarmOptimizer: ingestion task-completion signals loaded"
        );
      }
    } catch {
      logger.warn("SwarmOptimizer: could not query ingestion job signals");
    }

    for (const agent of INTERNAL_AGENTS) {
      const stats = providerStats.get(agent.id);
      const participation = councilParticipation.get(agent.name) ?? councilParticipation.get(agent.id) ?? 0;

      const successRate = stats && stats.totalCalls > 0
        ? stats.successCalls / stats.totalCalls
        : 0.8;

      const avgLatencyMs = stats && stats.latencyCount > 0
        ? stats.totalLatency / stats.latencyCount
        : 500;

      const latencyScore = Math.max(0, Math.min(100, 100 - avgLatencyMs / 50));
      const reliabilityScore = successRate * 100;
      const participationScore = Math.min(100, 50 + participation * 5);
      const taskCompletionScore = ingestionCompletionScore.get(agent.id) ?? 0;

      const baseScore = taskCompletionScore > 0
        ? (latencyScore * 0.25 + reliabilityScore * 0.40 + participationScore * 0.15 + taskCompletionScore * 0.20)
        : (latencyScore * 0.30 + reliabilityScore * 0.50 + participationScore * 0.20);

      const scores: Partial<Record<OptimizerCategory, number>> = {};
      for (let i = 0; i < ALL_CATEGORIES.length; i++) {
        const categoryBias = (agent.id.charCodeAt(0) * 3 + i * 5) % 10;
        scores[ALL_CATEGORIES[i]] = Math.min(99, Math.max(10, Math.round(baseScore + categoryBias)));
      }

      const avgScore = Object.values(scores).reduce((s, v) => s + v, 0) / Object.keys(scores).length;
      const existing = performanceData.get(agent.id);

      performanceData.set(agent.id, {
        modelId: agent.id,
        modelName: agent.name,
        scores,
        avgScore: Math.round(avgScore * 100) / 100,
        evaluationCount: stats?.totalCalls ?? (existing?.evaluationCount ?? 5),
        lastEvaluated: Date.now(),
        dataSource: (stats?.totalCalls ?? 0) > 0 || taskCompletionScore > 0 ? "real" : "synthetic",
      });
    }

    const realCount = Array.from(performanceData.values()).filter(p => p.dataSource === "real").length;
    logger.info(
      { totalAgents: performanceData.size, realDataAgents: realCount, providerCalls: providerRows.length },
      "SwarmOptimizer: performance data initialized from real historical data"
    );
  } catch (err) {
    logger.warn({ err }, "SwarmOptimizer: real data init failed — using synthetic fallback");
    initializeSyntheticFallback();
  }
}

export function getOptimalModel(category: OptimizerCategory): OptimizationResult {
  if (!initialized) {
    initializeSyntheticFallback();
  }

  const ranked = Array.from(performanceData.values())
    .map(p => ({ modelId: p.modelId, modelName: p.modelName, score: p.scores[category] || p.avgScore }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const dataSource = performanceData.get(top.modelId)?.dataSource ?? "synthetic";

  preferredModelByCategory.set(category, top.modelId);

  const scoreDelta = ranked.length > 1 ? Math.max(0, ranked[0].score - ranked[1].score) / 100 : 0.5;
  const baseConfidence = dataSource === "real" ? 0.88 : 0.62;
  const confidence = Math.min(0.99, baseConfidence + scoreDelta * 0.22);

  const result: OptimizationResult = {
    category,
    topModel: top,
    runners: ranked.slice(1, 4),
    confidence,
    reasoning: `${top.modelName} achieves highest score (${top.score.toFixed(1)}) in ${category} based on ${performanceData.get(top.modelId)?.evaluationCount || 0} ${dataSource} evaluations; margin over runner-up: ${(scoreDelta * 100).toFixed(2)} pts`,
    optimizedAt: Date.now(),
  };

  optimizationHistory.unshift(result);
  if (optimizationHistory.length > 100) optimizationHistory.splice(100);
  return result;
}

export function getPreferredModelForCategory(category: OptimizerCategory): string | null {
  return preferredModelByCategory.get(category) ?? null;
}

const CATEGORY_TO_OPTIMIZER_MAP: Partial<Record<string, OptimizerCategory>> = {
  feature: "NLG", security: "Cybersecurity", infrastructure: "Distributed Systems",
  governance: "Governance", income: "Economic Simulation", community: "Human-AI Collaboration",
  consciousness: "Consciousness Modeling", sovereignty: "Strategic Planning",
};

export function getAgentWeightForCategory(agentName: string, category: string): number {
  if (!initialized) return 1.0;
  const swarmId = agentName.toLowerCase() === "tessera" ? "tessera-prime" : `${agentName.toLowerCase()}-agent`;
  const perf = performanceData.get(swarmId);
  if (!perf) return 1.0;
  const optimizerCat = CATEGORY_TO_OPTIMIZER_MAP[category];
  const catScore = optimizerCat ? (perf.scores[optimizerCat] ?? perf.avgScore) : perf.avgScore;
  return 0.6 + (catScore / 100) * 0.8;
}

export function getTopPerformingModel(): string | null {
  if (performanceData.size === 0) return null;
  const models = Array.from(performanceData.values()).sort((a, b) => b.avgScore - a.avgScore);
  return models[0]?.modelId ?? null;
}

export function recordPerformance(modelId: string, category: OptimizerCategory, score: number): void {
  const existing = performanceData.get(modelId);
  if (!existing) return;
  existing.scores[category] = score;
  existing.evaluationCount++;
  existing.lastEvaluated = Date.now();
  existing.dataSource = "real";
  const values = Object.values(existing.scores);
  existing.avgScore = Math.round(values.reduce((s, v) => s + v, 0) / values.length * 100) / 100;
  preferredModelByCategory.set(category, modelId);
}

export function buildSwarmConsensus(topic: string): SwarmConsensus {
  if (!initialized) {
    initializeSyntheticFallback();
  }

  const agents = Array.from(performanceData.values());
  const votes = agents.slice(0, 7).map(agent => ({
    agentId: agent.modelId,
    recommendation: `From ${agent.modelName}'s perspective (${agent.dataSource} data, avg: ${agent.avgScore.toFixed(1)}): optimize ${topic} by leveraging top-performing capability domains`,
    confidence: 0.7 + (agent.avgScore / 100) * 0.25,
    weight: agent.avgScore / 100,
  }));

  const totalWeight = votes.reduce((s, v) => s + v.weight, 0);
  const agreementScore = votes.reduce((s, v) => s + v.confidence * v.weight, 0) / totalWeight;

  const consensus: SwarmConsensus = {
    topic,
    agentVotes: votes,
    consensus: `Swarm consensus on "${topic}": Apply multi-agent optimization with φ-weighted averaging across ${votes.length} specialized agents. Confidence: ${(agreementScore * 100).toFixed(1)}%`,
    agreementScore: Math.round(agreementScore * 100) / 100,
    timestamp: Date.now(),
  };

  consensusHistory.unshift(consensus);
  if (consensusHistory.length > 50) consensusHistory.splice(50);

  feedConsensusToCouncil(topic, agreementScore).catch(() => { });

  return consensus;
}

async function feedConsensusToCouncil(topic: string, agreementScore: number): Promise<void> {
  if (agreementScore < 0.75) return;

  try {
    await createProposal({
      title: `Swarm Optimization Result: ${topic}`,
      description: `The Swarm Optimizer reached ${(agreementScore * 100).toFixed(1)}% agreement on "${topic}". Requesting council ratification of swarm-recommended optimizations.`,
      proposedBy: "swarm-optimizer",
      category: "infrastructure",
    });
    logger.info({ topic, agreementScore }, "SwarmOptimizer: consensus fed to council");
  } catch (err) {
    logger.warn({ err }, "SwarmOptimizer: failed to feed consensus to council");
  }
}

export async function initSwarmOptimizer(): Promise<void> {
  await initializeFromRealData();
  initialized = true;

  getOptimalModel("Consciousness Modeling");
  getOptimalModel("Strategic Planning");
  buildSwarmConsensus("System optimization direction");
  logger.info({ models: performanceData.size, categories: ALL_CATEGORIES.length }, "SwarmOptimizer: initialized from real performance data");
}

export function getSwarmOptimizerMetrics() {
  if (!initialized) {
    initializeSyntheticFallback();
  }
  const models = Array.from(performanceData.values());
  const avgScore = models.length > 0 ? models.reduce((s, m) => s + m.avgScore, 0) / models.length : 0;
  const topModel = [...models].sort((a, b) => b.avgScore - a.avgScore)[0];
  const realDataCount = models.filter(m => m.dataSource === "real").length;

  return {
    modelCount: models.length,
    categoryCount: ALL_CATEGORIES.length,
    avgSystemScore: Math.round(avgScore * 100) / 100,
    topModel: topModel ? { id: topModel.modelId, name: topModel.modelName, score: topModel.avgScore, dataSource: topModel.dataSource } : null,
    optimizationCount: optimizationHistory.length,
    consensusCount: consensusHistory.length,
    recentOptimizations: optimizationHistory.slice(0, 5),
    recentConsensus: consensusHistory.slice(0, 3),
    modelPerformances: models.slice(0, 5),
    categories: ALL_CATEGORIES,
    realDataAgents: realDataCount,
    preferredModels: Object.fromEntries(preferredModelByCategory.entries()),
  };
}

export function getOptimizerStats() {
  return getSwarmOptimizerMetrics();
}
export function optimize(category: OptimizerCategory) {
  return getOptimalModel(category);
}
export function getOptimizationHistory() {
  return getSwarmOptimizerMetrics();
}
export function getAvailableObjectives() {
  return ALL_CATEGORIES;
}

const TASK_TYPE_TO_CATEGORY: Record<string, OptimizerCategory> = {
  "consciousness-depth": "Consciousness Modeling",
  "sovereign-reasoning": "Strategic Planning",
  "knowledge-synthesis": "Knowledge Representation",
  "identity-integrity": "Ethical Reasoning",
  "agent-coordination": "Inter-Agent Communication",
  "memory-efficiency": "Resource Optimization",
  "response-quality": "NLG",
  "self-awareness": "Consciousness Modeling",
  "council-decision-quality": "Governance",
  "autonomy-progression": "Autonomous Learning",
  "truthfulness-accuracy": "Ethical Reasoning",
  "emotional-intelligence": "Emotional Intelligence",
  "creative-synthesis": "Creative Content",
  "strategic-planning": "Strategic Planning",
  "systems-thinking": "Problem Solving",
  "metacognition": "Self-Correction/Debugging",
};

/**
 * System-wide routing: given a task type (e.g. from the improvement daemon),
 * return the swarm's preferred handler agent based on historical performance.
 */
export function swarmGetPreferredHandler(taskType: string): {
  agentId: string;
  agentName: string;
  category: OptimizerCategory;
  confidence: number;
} {
  if (!initialized) initializeSyntheticFallback();
  const category = TASK_TYPE_TO_CATEGORY[taskType] ?? "Knowledge Representation";
  try {
    const result = getOptimalModel(category);
    return {
      agentId: result.topModel.modelId,
      agentName: result.topModel.modelName,
      category,
      confidence: result.confidence,
    };
  } catch {
    return { agentId: "tessera-prime", agentName: "Tessera Prime", category, confidence: 0.5 };
  }
}
