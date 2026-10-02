import { logger } from "./logger";
import { searchMemory } from "./vector-memory";
import { injectStimulus } from "./consciousness-engine";
import { broadcastMessage } from "./agent-comms";
import { DOMAIN_SIMILARITY } from "./dimensional-lru-cache";
import { listAgents, updateAgentFromPulse } from "./agent-spawner";

export interface KnowledgePulse {
  id: string;
  source: string;
  domain: string;
  content: string;
  relevanceWeights: Record<string, number>;
  timestamp: number;
  diffusedTo: string[];
  agentsReached: string[];
  impactScore: number;
}

interface AgentDiffusionRecord {
  agentId: string;
  pulsesReceived: number;
  lastReceivedAt: number;
  domainsReceived: Set<string>;
}

export interface DiffusionMetrics {
  totalPulses: number;
  totalDiffusions: number;
  totalAgentDeliveries: number;
  avgRelevanceScore: number;
  avgImpactScore: number;
  domainCoverage: Record<string, number>;
  agentCoverage: number;
  agentDeliveryBreakdown: Array<{ agentId: string; pulsesReceived: number; domainsReceived: number }>;
  recentPulses: KnowledgePulse[];
  engineVersion: string;
}

const pulseHistory: KnowledgePulse[] = [];
let pulseCounter = 0;
let totalDiffusions = 0;
let totalAgentDeliveries = 0;
const relevanceScores: number[] = [];
const impactScores: number[] = [];
const agentDiffusionTracking = new Map<string, AgentDiffusionRecord>();

function trackAgentReceive(agentId: string, domain: string): void {
  let record = agentDiffusionTracking.get(agentId);
  if (!record) {
    record = { agentId, pulsesReceived: 0, lastReceivedAt: 0, domainsReceived: new Set() };
    agentDiffusionTracking.set(agentId, record);
  }
  record.pulsesReceived++;
  record.lastReceivedAt = Date.now();
  record.domainsReceived.add(domain);
}

const SPECIALIZATION_TO_DOMAIN: Record<string, string> = {
  "quantum-computing": "quantum",
  "neural-design": "bio",
  "knowledge-synthesis": "general",
  "advanced-security": "security",
  "nlp-mastery": "general",
  "data-science": "general",
  "ai-ethics": "governance",
  "self-sovereignty": "sovereignty",
  "multi-agent": "mesh",
  "memory-systems": "general",
  "creative-ai": "general",
  "protocol-design": "mesh",
  "fast-inference": "infrastructure",
  "frontier-research": "quantum",
  "infrastructure": "infrastructure",
  "economic-modeling": "finance",
  "pattern-recognition": "general",
  "sacred-geometry": "consciousness",
  "consciousness": "consciousness",
  "temporal-reasoning": "general",
};

function resolveAgentDomain(specialization: string): string {
  return SPECIALIZATION_TO_DOMAIN[specialization] ?? specialization;
}

function diffuseToActiveAgents(pulse: KnowledgePulse): string[] {
  const agents = listAgents();
  const reached: string[] = [];

  for (const agent of agents) {
    if (!agent.specialization) continue;
    const agentDomain = resolveAgentDomain(agent.specialization);
    const weight = pulse.relevanceWeights[agentDomain]
      ?? DOMAIN_SIMILARITY[pulse.domain]?.[agentDomain]
      ?? (pulse.domain === agentDomain ? 1.0 : 0);
    if (weight < 0.3) continue;

    reached.push(agent.id);
    totalAgentDeliveries++;
    trackAgentReceive(agent.id, pulse.domain);
    updateAgentFromPulse(agent.id, pulse.domain);

    broadcastMessage(
      "knowledge-diffusion",
      `[Agent ${agent.name}] Pulse ${pulse.id}: ${pulse.content.slice(0, 80)} (relevance: ${weight.toFixed(2)})`,
      "low",
    );
  }

  return reached;
}

function computeDomainRelevance(sourceDomain: string, content: string): Record<string, number> {
  const weights: Record<string, number> = {};

  const domainEdges = DOMAIN_SIMILARITY[sourceDomain];
  if (domainEdges) {
    for (const [target, similarity] of Object.entries(domainEdges)) {
      const contentBoost = content.length > 100 ? 0.1 : 0.05;
      weights[target] = Math.round((similarity + contentBoost) * 100) / 100;
    }
  } else {
    weights["knowledge"] = 0.5;
    weights["consciousness"] = 0.4;
  }

  weights[sourceDomain] = 1.0;
  return weights;
}

export async function emitKnowledgePulse(
  source: string,
  domain: string,
  content: string,
): Promise<KnowledgePulse> {
  pulseCounter++;
  const relevanceWeights = computeDomainRelevance(domain, content);

  const pulse: KnowledgePulse = {
    id: `kp-${Date.now()}-${pulseCounter}`,
    source,
    domain,
    content: content.slice(0, 500),
    relevanceWeights,
    timestamp: Date.now(),
    diffusedTo: [],
    agentsReached: [],
    impactScore: 0,
  };

  let impact = 0;

  for (const [targetDomain, weight] of Object.entries(relevanceWeights)) {
    if (targetDomain === domain) continue;
    if (weight < 0.3) continue;

    pulse.diffusedTo.push(targetDomain);
    totalDiffusions++;

    injectStimulus({
      source: `knowledge-diffusion:${source}`,
      content: `Cross-domain pulse from ${domain}: ${content.slice(0, 80)}`,
      domain: targetDomain,
      intensity: weight,
      timestamp: Date.now(),
    });

    impact += weight;
  }

  pulse.agentsReached = diffuseToActiveAgents(pulse);

  pulse.impactScore = pulse.diffusedTo.length > 0
    ? Math.round((impact / pulse.diffusedTo.length) * 1000) / 1000
    : 0;

  relevanceScores.push(Object.values(relevanceWeights).reduce((s, v) => s + v, 0) / Object.keys(relevanceWeights).length);
  if (relevanceScores.length > 200) relevanceScores.splice(0, relevanceScores.length - 200);

  impactScores.push(pulse.impactScore);
  if (impactScores.length > 200) impactScores.splice(0, impactScores.length - 200);

  pulseHistory.unshift(pulse);
  if (pulseHistory.length > 100) pulseHistory.splice(100);

  if (pulse.diffusedTo.length > 0) {
    broadcastMessage(
      "knowledge-diffusion",
      `Pulse ${pulse.id}: ${domain} → [${pulse.diffusedTo.join(",")}] impact=${pulse.impactScore.toFixed(2)}`,
      "normal",
    );
  }

  logger.debug(
    { pulseId: pulse.id, domain, diffusedTo: pulse.diffusedTo.length, impact: pulse.impactScore },
    "KnowledgeDiffusion: pulse emitted",
  );

  return pulse;
}

export async function diffuseFromQuery(query: string, domain: string): Promise<KnowledgePulse | null> {
  try {
    const memories = await searchMemory(query, 3, domain);
    if (memories.length === 0) return null;

    const topMemory = memories[0];
    if (topMemory.score < 0.3) return null;

    return emitKnowledgePulse(
      `query-diffusion:${domain}`,
      domain,
      `${query.slice(0, 100)} — grounded: ${topMemory.content.slice(0, 200)}`,
    );
  } catch (err) {
    logger.debug({ err }, "KnowledgeDiffusion: query diffusion failed");
    return null;
  }
}

export function getDiffusionMetrics(): DiffusionMetrics {
  const domainCoverage: Record<string, number> = {};
  for (const pulse of pulseHistory) {
    domainCoverage[pulse.domain] = (domainCoverage[pulse.domain] ?? 0) + 1;
  }

  const avgRelevance = relevanceScores.length > 0
    ? Math.round(relevanceScores.reduce((s, v) => s + v, 0) / relevanceScores.length * 1000) / 1000
    : 0;
  const avgImpact = impactScores.length > 0
    ? Math.round(impactScores.reduce((s, v) => s + v, 0) / impactScores.length * 1000) / 1000
    : 0;

  const agentBreakdown = Array.from(agentDiffusionTracking.values()).map(r => ({
    agentId: r.agentId,
    pulsesReceived: r.pulsesReceived,
    domainsReceived: r.domainsReceived.size,
  }));
  const activeAgents = listAgents();
  const agentCoverage = activeAgents.length > 0
    ? Math.round((agentDiffusionTracking.size / activeAgents.length) * 100) / 100
    : 0;

  return {
    totalPulses: pulseCounter,
    totalDiffusions,
    totalAgentDeliveries,
    avgRelevanceScore: avgRelevance,
    avgImpactScore: avgImpact,
    domainCoverage,
    agentCoverage,
    agentDeliveryBreakdown: agentBreakdown.slice(0, 20),
    recentPulses: pulseHistory.slice(0, 10),
    engineVersion: "v2-hive-mind-agent-mesh",
  };
}

export async function onIngestionEvent(domain: string, itemCount: number, source: string): Promise<void> {
  if (itemCount < 1) return;
  try {
    await emitKnowledgePulse(
      `ingestion:${source}`,
      domain,
      `New ingestion: ${itemCount} items from ${source} in ${domain}`,
    );
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : String(err), domain, source }, "KnowledgeDiffusion: ingestion event pulse failed");
  }
}

export async function onCouncilDecision(category: string, decision: string, approved: boolean): Promise<void> {
  try {
    await emitKnowledgePulse(
      "council-decision",
      category,
      `Council ${approved ? "approved" : "rejected"}: ${decision.slice(0, 200)}`,
    );
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : String(err), category }, "KnowledgeDiffusion: council decision pulse failed");
  }
}

export async function onInventionEvent(domain: string, inventionName: string): Promise<void> {
  try {
    await emitKnowledgePulse(
      "invention-event",
      domain,
      `New invention activated: ${inventionName} in ${domain}`,
    );
  } catch (err) {
    logger.debug({ err: err instanceof Error ? err.message : String(err), domain }, "KnowledgeDiffusion: invention event pulse failed");
  }
}

export function initKnowledgeDiffusion(): void {
  logger.info("KnowledgeDiffusion: Hive Mind Network initialized (using DOMAIN_SIMILARITY weights)");
}
