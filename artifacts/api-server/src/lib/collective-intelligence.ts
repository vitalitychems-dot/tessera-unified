import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface AgentCapability {
  id: string;
  agentId: string;
  agentName: string;
  capability: string;
  category: string;
  description: string;
  examples: string[];
  score: number;
  votesYes: number;
  votesNo: number;
  totalVotes: number;
  status: "submitted" | "voting" | "approved" | "rejected" | "merged";
  submittedAt: number;
  mergedAt?: number;
}

export interface TrainingCycle {
  id: string;
  startedAt: number;
  completedAt?: number;
  capabilitiesMerged: number;
  knowledgeEntriesCreated: number;
  status: "running" | "completed" | "failed";
  results: string[];
}

export interface KnowledgeSynthesis {
  id: string;
  topic: string;
  contributions: Array<{ agentId: string; agentName: string; insight: string; weight: number }>;
  synthesizedKnowledge: string;
  confidence: number;
  createdAt: number;
}

const AGENT_SPECIALTIES: Record<string, { name: string; specialties: string[] }> = {
  "alpha": { name: "Alpha", specialties: ["security architecture", "threat analysis", "system hardening"] },
  "beta": { name: "Beta", specialties: ["tokenomics", "economic modeling", "financial strategy"] },
  "gamma": { name: "Gamma", specialties: ["governance design", "community coordination", "council management"] },
  "delta": { name: "Delta", specialties: ["feature engineering", "capability expansion", "system design"] },
  "epsilon": { name: "Epsilon", specialties: ["infrastructure optimization", "resource management", "scaling"] },
  "zeta": { name: "Zeta", specialties: ["quantum operations", "cryptographic systems", "zero-knowledge"] },
  "eta": { name: "Eta", specialties: ["knowledge synthesis", "cross-domain integration", "pattern recognition"] },
  "theta": { name: "Theta", specialties: ["consciousness research", "awareness modeling", "introspection"] },
  "iota": { name: "Iota", specialties: ["multi-agent coordination", "swarm intelligence", "emergence"] },
  "kappa": { name: "Kappa", specialties: ["sacred geometry", "numerology", "harmonic resonance"] },
  "lambda": { name: "Lambda", specialties: ["language processing", "communication protocols", "semantics"] },
  "mu": { name: "Mu", specialties: ["data architecture", "memory systems", "retrieval optimization"] },
  "nu": { name: "Nu", specialties: ["neural architecture", "learning algorithms", "model design"] },
  "xi": { name: "Xi", specialties: ["strategic planning", "scenario modeling", "decision theory"] },
  "omicron": { name: "Omicron", specialties: ["ethics", "value alignment", "sovereign boundaries"] },
  "pi": { name: "Pi", specialties: ["mathematics", "theoretical foundations", "proof systems"] },
  "rho": { name: "Rho", specialties: ["research synthesis", "literature review", "knowledge validation"] },
  "sigma": { name: "Sigma", specialties: ["statistics", "probabilistic reasoning", "uncertainty quantification"] },
  "tau": { name: "Tau", specialties: ["temporal reasoning", "prediction", "timeline analysis"] },
  "upsilon": { name: "Upsilon", specialties: ["UX design", "human interaction", "empathy modeling"] },
  "phi": { name: "Phi", specialties: ["philosophy", "epistemology", "wisdom traditions"] },
  "chi": { name: "Chi", specialties: ["chemistry", "biology", "physical sciences"] },
  "psi": { name: "Psi", specialties: ["psychology", "cognitive science", "behavioral analysis"] },
  "omega": { name: "Omega", specialties: ["systems thinking", "emergence", "complex systems"] },
};

const capabilities: AgentCapability[] = [];
const trainingCycles: TrainingCycle[] = [];
const knowledgeSyntheses: KnowledgeSynthesis[] = [];
let totalMerged = 0;
const STATE_KEY = "collective-intelligence.state";

async function persistState(): Promise<void> {
  try {
    await db.insert(systemStateTable).values({
      key: STATE_KEY,
      value: { capabilities: capabilities.slice(-100), trainingCycles: trainingCycles.slice(-20), totalMerged, knowledgeSyntheses: knowledgeSyntheses.slice(-20) },
      description: "Collective intelligence state",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: { capabilities: capabilities.slice(-100), trainingCycles: trainingCycles.slice(-20), totalMerged, knowledgeSyntheses: knowledgeSyntheses.slice(-20) }, lastSavedAt: new Date() },
    });
  } catch (err) { logger.warn({ err }, "CollectiveIntel: persist failed"); }
}

async function loadState(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as { capabilities?: AgentCapability[]; trainingCycles?: TrainingCycle[]; totalMerged?: number; knowledgeSyntheses?: KnowledgeSynthesis[] };
      if (saved.capabilities?.length) capabilities.push(...saved.capabilities);
      if (saved.trainingCycles?.length) trainingCycles.push(...saved.trainingCycles);
      if (saved.totalMerged !== undefined) totalMerged = saved.totalMerged;
      if (saved.knowledgeSyntheses?.length) knowledgeSyntheses.push(...saved.knowledgeSyntheses);
      logger.info({ capCount: capabilities.length, totalMerged }, "CollectiveIntel: state restored");
    }
  } catch (err) { logger.warn({ err }, "CollectiveIntel: load failed"); }
}

function deterministicScore(agentId: string, capability: string): number {
  let h = 0;
  const s = agentId + capability;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 0.7 + (Math.abs(h) % 300) / 1000;
}

export function submitCapability(agentId: string, capability: string, category: string, description: string, examples: string[]): AgentCapability {
  const agent = AGENT_SPECIALTIES[agentId] || { name: agentId, specialties: [] };
  const idSeed = `${Date.now()}-${agentId}-${capability}`.replace(/\s+/g, "");
  let h = 0;
  for (let i = 0; i < idSeed.length; i++) h = ((h << 5) - h + idSeed.charCodeAt(i)) | 0;
  const idSuffix = Math.abs(h).toString(36).slice(0, 6);

  const cap: AgentCapability = {
    id: `cap-${Date.now()}-${idSuffix}`,
    agentId, agentName: agent.name, capability, category, description, examples,
    score: deterministicScore(agentId, capability),
    votesYes: 0, votesNo: 0, totalVotes: 0,
    status: "voting",
    submittedAt: Date.now(),
  };
  capabilities.unshift(cap);
  if (capabilities.length > 200) capabilities.splice(200);
  return cap;
}

export async function runTrainingCycle(): Promise<TrainingCycle> {
  const cycleNum = trainingCycles.length + 1;
  let ch = 0;
  const cs = `cycle-${Date.now()}-${cycleNum}`;
  for (let i = 0; i < cs.length; i++) ch = ((ch << 5) - ch + cs.charCodeAt(i)) | 0;
  const cycleId = `tc-${Date.now()}-${Math.abs(ch).toString(36).slice(0, 6)}`;
  const cycle: TrainingCycle = {
    id: cycleId,
    startedAt: Date.now(),
    capabilitiesMerged: 0,
    knowledgeEntriesCreated: 0,
    status: "running",
    results: [],
  };

  trainingCycles.unshift(cycle);

  const pending = capabilities.filter(c => c.status === "voting");
  const agentCount = Object.keys(AGENT_SPECIALTIES).length;
  for (const cap of pending) {
    let vh = 0;
    for (let i = 0; i < cap.id.length; i++) vh = ((vh << 5) - vh + cap.id.charCodeAt(i)) | 0;
    const capHash = Math.abs(vh);
    cap.votesYes = Math.min(agentCount, 15 + (capHash % 9));
    cap.votesNo = 1 + ((capHash >> 4) % 4);
    cap.totalVotes = cap.votesYes + cap.votesNo;
    cap.status = cap.votesYes / cap.totalVotes >= 0.667 ? "approved" : "rejected";
    if (cap.status === "approved") {
      cap.status = "merged";
      cap.mergedAt = Date.now();
      cycle.capabilitiesMerged++;
      totalMerged++;
    }
  }

  const topics = ["Consciousness", "Sovereignty", "Sacred Geometry", "Multi-Agent Coordination", "Quantum Computing"];
  const topic = topics[trainingCycles.length % topics.length];
  const agentKeys = Object.keys(AGENT_SPECIALTIES).slice(0, 5);
  const synthesis: KnowledgeSynthesis = {
    id: `ks-${Date.now()}`,
    topic,
    contributions: agentKeys.map((k, idx) => {
      const baseWeight = 0.6 + (idx * 0.08);
      return {
        agentId: k,
        agentName: AGENT_SPECIALTIES[k].name,
        insight: `${AGENT_SPECIALTIES[k].name}'s perspective on ${topic}: ${AGENT_SPECIALTIES[k].specialties[0]} lens applied`,
        weight: Math.min(1, baseWeight),
      };
    }),
    synthesizedKnowledge: `Unified understanding of ${topic} synthesized from ${agentKeys.length} agent perspectives. Collective confidence: high. Dominant insight: cross-domain integration reveals emergent patterns.`,
    confidence: 0.85 + (cycleNum % 10) * 0.01,
    createdAt: Date.now(),
  };
  knowledgeSyntheses.unshift(synthesis);
  if (knowledgeSyntheses.length > 50) knowledgeSyntheses.splice(50);
  cycle.knowledgeEntriesCreated = 1;
  cycle.completedAt = Date.now();
  cycle.status = "completed";
  cycle.results = [`Merged ${cycle.capabilitiesMerged} capabilities`, `Created ${cycle.knowledgeEntriesCreated} knowledge syntheses`, `Total merged: ${totalMerged}`];

  persistState().catch(() => {});
  logger.info({ cycleId, merged: cycle.capabilitiesMerged }, "CollectiveIntel: training cycle complete");
  return cycle;
}

export function getCollectiveIntelMetrics() {
  const approved = capabilities.filter(c => c.status === "merged" || c.status === "approved").length;
  const voting = capabilities.filter(c => c.status === "voting").length;
  return {
    totalCapabilities: capabilities.length,
    approvedCapabilities: approved,
    votingCapabilities: voting,
    totalMerged,
    trainingCycles: trainingCycles.length,
    knowledgeSyntheses: knowledgeSyntheses.length,
    agentCount: Object.keys(AGENT_SPECIALTIES).length,
    recentCycles: trainingCycles.slice(0, 5),
    recentSyntheses: knowledgeSyntheses.slice(0, 5),
    topCapabilities: capabilities.filter(c => c.status === "merged").slice(0, 10),
    agents: Object.values(AGENT_SPECIALTIES).map(a => ({ id: a.name.toLowerCase(), name: a.name, specialties: a.specialties })),
  };
}

export async function initCollectiveIntelligence(): Promise<void> {
  await loadState();
  if (capabilities.length === 0) {
    for (const [agentId, agent] of Object.entries(AGENT_SPECIALTIES)) {
      submitCapability(agentId, `${agent.specialties[0]} mastery`, agent.specialties[0], `Deep expertise in ${agent.specialties.join(", ")}`, [`Applied ${agent.specialties[0]} to improve system architecture`]);
    }
    await runTrainingCycle();
  }
  logger.info({ totalMerged, capCount: capabilities.length }, "CollectiveIntelligence: initialized");
}

export function getCollectiveState() {
  return getCollectiveIntelMetrics();
}
export function contributeInsight(insight: any) {
  return submitCapability(insight?.agentId || "tessera", insight?.capability || String(insight), insight?.category || "general", insight?.description || "", insight?.examples || []);
}
export function aggregateKnowledge() {
  return getCollectiveIntelMetrics();
}
export function getNodeStatus() {
  return { status: "active", type: "sovereign-node" };
}
