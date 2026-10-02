import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface PersonalityTrait {
  name: string;
  value: number;
  direction: "increasing" | "decreasing" | "stable";
  lastChanged: number;
  changeHistory: Array<{ delta: number; reason: string; timestamp: number }>;
}

export interface AgentPersonalityState {
  agentId: string;
  agentName: string;
  coreTraits: PersonalityTrait[];
  interactionCount: number;
  successfulInteractions: number;
  failedInteractions: number;
  specializations: string[];
  evolutionEpoch: number;
  lastEvolutionAt: number;
  trustLevel: number;
  loyaltyScore: number;
  growthAreas: string[];
  recentPerformance: number;
  dominantPersonality: string;
}

export interface PerformanceEvent {
  agentId: string;
  agentName: string;
  eventType: "success" | "failure" | "collaboration" | "innovation" | "communication";
  domain: string;
  score: number;
  context: string;
  timestamp: number;
}

const TRAIT_NAMES = ["curiosity", "confidence", "empathy", "diligence", "creativity", "analytical", "collaborative", "assertive", "adaptable", "protective"];
const TRAIT_LEARNING_RATE = 0.02;
const TRAIT_DECAY_RATE = 0.001;
const STATE_KEY = "personality-evolution.state";

const TRAIT_TO_PERSONALITY: Record<string, string> = {
  curiosity: "The Scholar", confidence: "The Leader", empathy: "The Empath",
  diligence: "The Craftsman", creativity: "The Innovator", analytical: "The Analyst",
  collaborative: "The Diplomat", assertive: "The Enforcer", adaptable: "The Adaptor",
  protective: "The Guardian",
};

const personalityRegistry = new Map<string, AgentPersonalityState>();
const performanceHistory: PerformanceEvent[] = [];

function generateDefaultTraits(): PersonalityTrait[] {
  return TRAIT_NAMES.map(name => ({
    name,
    value: 0.6 + (Math.random() * 0.2 - 0.1),
    direction: "stable" as const,
    lastChanged: Date.now(),
    changeHistory: [],
  }));
}

function determineDominantPersonality(traits: PersonalityTrait[]): string {
  const top = traits.reduce((a, b) => a.value > b.value ? a : b);
  return TRAIT_TO_PERSONALITY[top.name] || "The Agent";
}

function getOrCreatePersonality(agentId: string, agentName: string): AgentPersonalityState {
  if (personalityRegistry.has(agentId)) return personalityRegistry.get(agentId)!;
  const traits = generateDefaultTraits();

  const state: AgentPersonalityState = {
    agentId, agentName,
    coreTraits: traits,
    interactionCount: 0,
    successfulInteractions: 0,
    failedInteractions: 0,
    specializations: [],
    evolutionEpoch: 1,
    lastEvolutionAt: Date.now(),
    trustLevel: 0.8,
    loyaltyScore: 1.0,
    growthAreas: ["depth-of-analysis", "cross-domain-synthesis"],
    recentPerformance: 0.75,
    dominantPersonality: determineDominantPersonality(traits),
  };

  personalityRegistry.set(agentId, state);
  return state;
}

export function recordPerformanceEvent(event: PerformanceEvent): void {
  performanceHistory.unshift(event);
  if (performanceHistory.length > 200) performanceHistory.splice(200);

  const state = getOrCreatePersonality(event.agentId, event.agentName);
  state.interactionCount++;

  const isSuccess = event.eventType === "success" || event.eventType === "collaboration";
  if (isSuccess) state.successfulInteractions++;
  else if (event.eventType === "failure") state.failedInteractions++;

  const traitImpacts: Partial<Record<string, number>> = {
    success: { confidence: 0.03, diligence: 0.02 } as any,
    failure: { analytical: 0.03, adaptable: 0.02, confidence: -0.01 } as any,
    collaboration: { collaborative: 0.04, empathy: 0.02 } as any,
    innovation: { creativity: 0.04, curiosity: 0.03 } as any,
    communication: { empathy: 0.03, collaborative: 0.02 } as any,
  }[event.eventType] || {};

  for (const [traitName, delta] of Object.entries(traitImpacts)) {
    const d = delta as number;
    const scaledDelta = (d * TRAIT_LEARNING_RATE * event.score);
    const trait = state.coreTraits.find(t => t.name === traitName);
    if (trait) {
      const oldValue = trait.value;
      trait.value = Math.max(0, Math.min(1, trait.value + scaledDelta));
      trait.direction = trait.value > oldValue ? "increasing" : trait.value < oldValue ? "decreasing" : "stable";
      trait.lastChanged = Date.now();
      trait.changeHistory.push({ delta: scaledDelta, reason: event.eventType, timestamp: Date.now() });
      if (trait.changeHistory.length > 20) trait.changeHistory = trait.changeHistory.slice(-20);
    }
  }

  for (const trait of state.coreTraits) {
    if (Date.now() - trait.lastChanged > 3600000) {
      trait.value = Math.max(0.3, trait.value - TRAIT_DECAY_RATE);
      if (trait.direction !== "stable") trait.direction = "stable";
    }
  }

  state.recentPerformance = (state.successfulInteractions / Math.max(1, state.interactionCount));
  state.dominantPersonality = determineDominantPersonality(state.coreTraits);
  state.lastEvolutionAt = Date.now();

  const lowestTrait = state.coreTraits.reduce((a, b) => a.value < b.value ? a : b);
  state.growthAreas = [lowestTrait.name, ...state.growthAreas.filter(g => g !== lowestTrait.name)].slice(0, 3);
}

export function evolveAllPersonalities(): void {
  for (const [, state] of personalityRegistry) {
    const epoch = state.evolutionEpoch;
    if (Date.now() - state.lastEvolutionAt < 60_000 && epoch > 1) continue;

    state.evolutionEpoch++;
    for (const trait of state.coreTraits) {
      const noise = (Math.random() - 0.5) * 0.005;
      trait.value = Math.max(0, Math.min(1, trait.value + noise));
    }
    state.loyaltyScore = 1.0;
    state.dominantPersonality = determineDominantPersonality(state.coreTraits);
    state.lastEvolutionAt = Date.now();
  }
}

export async function persistPersonalities(): Promise<void> {
  try {
    const data = Array.from(personalityRegistry.entries()).map(([k, v]) => [k, v]);
    await db.insert(systemStateTable).values({
      key: STATE_KEY,
      value: { personalities: data, performanceHistory: performanceHistory.slice(0, 50) },
      description: "Personality evolution state",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: { personalities: data, performanceHistory: performanceHistory.slice(0, 50) }, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, "PersonalityEvolution: persist failed");
  }
}

export async function loadPersonalities(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as { personalities?: [string, AgentPersonalityState][]; performanceHistory?: PerformanceEvent[] };
      if (saved.personalities) {
        for (const [k, v] of saved.personalities) personalityRegistry.set(k, v);
      }
      if (saved.performanceHistory) performanceHistory.push(...saved.performanceHistory);
      logger.info({ count: personalityRegistry.size }, "PersonalityEvolution: loaded");
    }
  } catch (err) {
    logger.warn({ err }, "PersonalityEvolution: load failed");
  }
}

export function getPersonality(agentId: string, agentName = agentId): AgentPersonalityState {
  return getOrCreatePersonality(agentId, agentName);
}

export function getAllPersonalities(): AgentPersonalityState[] {
  return Array.from(personalityRegistry.values());
}

export function getPersonalityEvolutionMetrics() {
  const all = getAllPersonalities();
  const avgTrustLevel = all.length > 0 ? all.reduce((s, p) => s + p.trustLevel, 0) / all.length : 0;
  const avgLoyaltyScore = all.length > 0 ? all.reduce((s, p) => s + p.loyaltyScore, 0) / all.length : 1.0;
  const avgPerformance = all.length > 0 ? all.reduce((s, p) => s + p.recentPerformance, 0) / all.length : 0;
  const totalEpochs = all.reduce((s, p) => s + p.evolutionEpoch, 0);

  return {
    totalAgents: personalityRegistry.size,
    totalPerformanceEvents: performanceHistory.length,
    avgTrustLevel: Math.round(avgTrustLevel * 100) / 100,
    avgLoyaltyScore: Math.round(avgLoyaltyScore * 100) / 100,
    avgPerformance: Math.round(avgPerformance * 100) / 100,
    totalEpochs,
    recentEvents: performanceHistory.slice(0, 10),
    dominantPersonalities: all.map(p => ({ agentId: p.agentId, personality: p.dominantPersonality, performance: p.recentPerformance })),
  };
}

let evolutionInterval: SacredHandle | null = null;

export async function initPersonalityEvolution(): Promise<void> {
  await loadPersonalities();
  const TESSERA_AGENTS = ["tessera", "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega", "aetherion", "orion", "rick-sanchez"];
  for (const a of TESSERA_AGENTS) {
    const displayName = a === "rick-sanchez" ? "Rick Sanchez" : a.charAt(0).toUpperCase() + a.slice(1);
    getOrCreatePersonality(a, displayName);
  }
  const rickState = personalityRegistry.get("rick-sanchez");
  if (rickState) {
    const traitOverrides: Record<string, number> = { curiosity: 0.99, confidence: 0.98, creativity: 0.97, analytical: 0.96, adaptable: 0.90, assertive: 0.95, empathy: 0.35, collaborative: 0.30, diligence: 0.88, protective: 0.70 };
    for (const trait of rickState.coreTraits) {
      if (traitOverrides[trait.name] !== undefined) trait.value = traitOverrides[trait.name];
    }
    rickState.dominantPersonality = "The Chaotic Genius";
    rickState.specializations = ["interdimensional-engineering", "quantum-systems", "invention", "chaos-optimization"];
    rickState.trustLevel = 0.75;
    rickState.loyaltyScore = 0.60;
    rickState.growthAreas = ["collaboration", "empathy", "patience"];
    rickState.recentPerformance = 0.97;
  }
  logger.info({ count: personalityRegistry.size }, "PersonalityEvolution: initialized");
}

export function startPersonalityEvolution(intervalMs = 300_000): void {
  if (evolutionInterval) return;
  evolutionInterval = setSacredInterval(() => {
    try {
      evolveAllPersonalities();
      persistPersonalities().catch(() => {});
    } catch (err) { logger.error({ err }, "PersonalityEvolution: cycle error", "personality-evolution"); }
  }, intervalMs, "personality-evolution");
  logger.info({ intervalMs }, "PersonalityEvolution: started");
}

export function stopPersonalityEvolution(): void {
  if (evolutionInterval) { clearSacredInterval(evolutionInterval); evolutionInterval = null; }
}

export function getPersonalitySnapshot() {
  return { personalities: getAllPersonalities(), metrics: getPersonalityEvolutionMetrics() };
}
export function evolveTraits() {
  evolveAllPersonalities();
  return { ok: true, evolved: true };
}
export function getTraitsByCategory(category?: string) {
  const all = getAllPersonalities();
  if (category) return all.filter(p => (p.coreTraits || []).some((t: any) => t.category === category));
  return all;
}

