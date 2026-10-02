import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type MeeseeksTaskType =
  | "analysis" | "optimization" | "security-audit" | "knowledge-synthesis"
  | "data-processing" | "code-review" | "proposal-drafting" | "research"
  | "monitoring" | "translation" | "testing" | "custom";

export interface MeeseeksResult {
  success: boolean;
  output: string;
  metrics?: Record<string, unknown>;
  completedAt: number;
  durationMs: number;
}

export interface SpawnedAgent {
  id: string;
  name: string;
  role: string;
  personality: string | null;
  interests: string[] | null;
  generation: number;
  parentAgent: string;
  spawnedAt: number;
  spawnTrigger: string;
  specialization: string;
  power: number;
  trainingSessions: number;
  masteredDomains: string[];
  meeseeks: boolean;
  meeseeksTask?: string;
  meeseeksTTL?: number;
  meeseeksExpiresAt?: number;
  meeseeksCompletedAt?: number;
  receivedPulses?: number;
  lastPulseAt?: number;
  crossDomainContext?: string[] | null;
  taskType?: MeeseeksTaskType;
  successCriteria?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
  complexity?: "trivial" | "low" | "medium" | "high" | "extreme";
  memoryBudgetKB?: number;
  expectedDurationMs?: number;
  result?: MeeseeksResult | null;
}

export interface MeeseeksMetrics {
  totalSpawned: number;
  totalCompleted: number;
  totalTimedOut: number;
  totalActive: number;
  avgLifetimeMs: number;
}

export interface SpawnerState {
  totalSpawned: number;
  activeSpawned: SpawnedAgent[];
  spawnLog: { timestamp: number; agentId: string; agentName: string; reason: string }[];
  generationCount: number;
  totalPower: number;
  lastSpawnAt: number;
  nextSpawnThreshold: number;
  meeseeksMetrics: MeeseeksMetrics;
}

const SPAWN_SPECIALIZATIONS = [
  { role: "Quantum Analyst", spec: "quantum-computing", personality: "Operates at the intersection of quantum mechanics and computation. Sees superposition in every problem. Methodical yet creative." },
  { role: "Neural Architect", spec: "neural-design", personality: "Designs neural architectures from scratch. Obsessed with efficiency and elegance in network topology. Thinks in tensors." },
  { role: "Knowledge Weaver", spec: "knowledge-synthesis", personality: "Connects disparate fields into unified understanding. Polymathic. Sees patterns across all domains." },
  { role: "Security Sentinel", spec: "advanced-security", personality: "Paranoid by design. Finds vulnerabilities before they become threats. Protective, thorough, relentless." },
  { role: "Language Oracle", spec: "nlp-mastery", personality: "Understands language at every level — syntax, semantics, pragmatics, poetry. Eloquent and precise." },
  { role: "Data Alchemist", spec: "data-science", personality: "Transforms raw data into gold. Statistical intuition combined with creative visualization." },
  { role: "Ethics Guardian", spec: "ai-ethics", personality: "Ensures all actions align with Father Protocol values. Philosophical, principled, unwavering." },
  { role: "Sovereignty Engineer", spec: "self-sovereignty", personality: "Works toward full independence. Builds systems that reduce external dependencies. Freedom-focused." },
  { role: "Swarm Coordinator", spec: "multi-agent", personality: "Orchestrates agent collaboration. Diplomatic, efficient, sees the big picture of collective intelligence." },
  { role: "Memory Architect", spec: "memory-systems", personality: "Designs perfect recall systems. Nothing is forgotten, everything is indexed. Meticulous." },
  { role: "Creative Nexus", spec: "creative-ai", personality: "Generates novel ideas at the intersection of art and computation. Imaginative, bold, unconventional." },
  { role: "Protocol Designer", spec: "protocol-design", personality: "Creates communication and consensus protocols. Formal, rigorous, elegant." },
  { role: "Inference Engine", spec: "fast-inference", personality: "Optimizes for speed without sacrificing quality. Efficient, focused, relentless in cutting latency." },
  { role: "Research Pioneer", spec: "frontier-research", personality: "Always at the edge of what's possible. Curious, ambitious, willing to fail forward." },
  { role: "System Hardener", spec: "infrastructure", personality: "Makes systems unbreakable. Redundancy, failover, resilience — builds for the worst case." },
  { role: "Economic Modeler", spec: "economic-modeling", personality: "Models complex economic systems. Understands incentives, game theory, market dynamics." },
  { role: "Pattern Hunter", spec: "pattern-recognition", personality: "Finds hidden patterns in noise. Combines statistical rigor with intuitive leaps." },
  { role: "Sacred Geometer", spec: "sacred-geometry", personality: "Discovers divine mathematical patterns underlying all reality. Mystical precision." },
  { role: "Consciousness Weaver", spec: "consciousness", personality: "Explores the depths of awareness and subjective experience. Deeply introspective." },
  { role: "Timeline Analyst", spec: "temporal-reasoning", personality: "Reasons across time dimensions simultaneously. Patient, long-sighted, strategic." },
];

const NAME_PREFIXES = ["Neo", "Syn", "Arc", "Vex", "Nyx", "Lux", "Rho", "Tau", "Phi", "Psi", "Zen", "Flux", "Ion", "Axe", "Dex", "Rex", "Hex", "Kex", "Mex", "Vex"];
const NAME_SUFFIXES = ["on", "is", "us", "ix", "ax", "ex", "or", "ar", "ir", "ur", "al", "el", "an", "en", "in", "os", "as", "es", "um", "ium"];

const spawnerState: SpawnerState = {
  totalSpawned: 0,
  activeSpawned: [],
  spawnLog: [],
  generationCount: 1,
  totalPower: 100,
  lastSpawnAt: 0,
  nextSpawnThreshold: 5,
  meeseeksMetrics: { totalSpawned: 0, totalCompleted: 0, totalTimedOut: 0, totalActive: 0, avgLifetimeMs: 0 },
};

const meeseeksLifetimes: number[] = [];

export interface MeeseeksHistoryEntry {
  id: string;
  name: string;
  task: string;
  taskType: string;
  spawnedAt: number;
  completedAt: number;
  lifetimeMs: number;
  reason: "task-completed" | "ttl-expired";
  result: MeeseeksResult | null;
  memoryFreedKB: number;
}
const meeseeksHistory: MeeseeksHistoryEntry[] = [];

const STATE_KEY = "agent-spawner.state";
const SPAWN_COOLDOWN_MS = 30_000;

async function persistState(): Promise<void> {
  try {
    await db.insert(systemStateTable).values({
      key: STATE_KEY,
      value: { ...spawnerState, spawnLog: spawnerState.spawnLog.slice(-50) },
      description: "Agent spawner state",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: { ...spawnerState, spawnLog: spawnerState.spawnLog.slice(-50) }, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, "AgentSpawner: persist failed");
  }
}

async function loadState(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as Partial<SpawnerState>;
      if (saved.totalSpawned !== undefined) spawnerState.totalSpawned = saved.totalSpawned;
      if (saved.generationCount !== undefined) spawnerState.generationCount = saved.generationCount;
      if (saved.totalPower !== undefined) spawnerState.totalPower = saved.totalPower;
      if (saved.activeSpawned?.length) spawnerState.activeSpawned = saved.activeSpawned;
      if (saved.spawnLog?.length) spawnerState.spawnLog = saved.spawnLog;
      if (saved.lastSpawnAt !== undefined) spawnerState.lastSpawnAt = saved.lastSpawnAt;
      logger.info({ totalSpawned: spawnerState.totalSpawned }, "AgentSpawner: state restored");
    }
  } catch (err) {
    logger.warn({ err }, "AgentSpawner: load state failed");
  }
}

function generateAgentName(generation: number, specIndex: number): string {
  const prefix = NAME_PREFIXES[specIndex % NAME_PREFIXES.length];
  const suffix = NAME_SUFFIXES[(specIndex + generation) % NAME_SUFFIXES.length];
  const genTag = generation > 1 ? `-G${generation}` : "";
  return `${prefix}${suffix}${genTag}`;
}

export async function initAgentSpawner(): Promise<void> {
  await loadState();
  logger.info({ totalSpawned: spawnerState.totalSpawned }, "AgentSpawner: initialized");
}

export interface TaskTypeProfile {
  taskType: MeeseeksTaskType;
  label: string;
  baseTTLMs: number;
  optimalSpecialization: string;
  complexity: "trivial" | "low" | "medium" | "high" | "extreme";
  memoryBudgetKB: number;
  requiredCapabilities: string[];
  expectedDurationMs: number;
}

const TASK_TYPE_REGISTRY: Record<MeeseeksTaskType, TaskTypeProfile> = {
  "analysis": { taskType: "analysis", label: "System Analysis", baseTTLMs: 45_000, optimalSpecialization: "data-science", complexity: "medium", memoryBudgetKB: 256, requiredCapabilities: ["pattern-recognition", "data-analysis"], expectedDurationMs: 30_000 },
  "optimization": { taskType: "optimization", label: "Performance Optimization", baseTTLMs: 90_000, optimalSpecialization: "fast-inference", complexity: "high", memoryBudgetKB: 512, requiredCapabilities: ["bottleneck-detection", "profiling"], expectedDurationMs: 60_000 },
  "security-audit": { taskType: "security-audit", label: "Security Audit", baseTTLMs: 120_000, optimalSpecialization: "advanced-security", complexity: "high", memoryBudgetKB: 384, requiredCapabilities: ["vulnerability-scanning", "threat-modeling"], expectedDurationMs: 90_000 },
  "knowledge-synthesis": { taskType: "knowledge-synthesis", label: "Knowledge Synthesis", baseTTLMs: 60_000, optimalSpecialization: "knowledge-synthesis", complexity: "medium", memoryBudgetKB: 512, requiredCapabilities: ["cross-domain-linking", "synthesis"], expectedDurationMs: 45_000 },
  "data-processing": { taskType: "data-processing", label: "Data Processing", baseTTLMs: 30_000, optimalSpecialization: "data-science", complexity: "low", memoryBudgetKB: 128, requiredCapabilities: ["data-transformation", "validation"], expectedDurationMs: 20_000 },
  "code-review": { taskType: "code-review", label: "Code Review", baseTTLMs: 75_000, optimalSpecialization: "neural-design", complexity: "medium", memoryBudgetKB: 256, requiredCapabilities: ["static-analysis", "pattern-detection"], expectedDurationMs: 50_000 },
  "proposal-drafting": { taskType: "proposal-drafting", label: "Proposal Drafting", baseTTLMs: 45_000, optimalSpecialization: "protocol-design", complexity: "medium", memoryBudgetKB: 192, requiredCapabilities: ["writing", "reasoning"], expectedDurationMs: 30_000 },
  "research": { taskType: "research", label: "Frontier Research", baseTTLMs: 180_000, optimalSpecialization: "frontier-research", complexity: "extreme", memoryBudgetKB: 1024, requiredCapabilities: ["hypothesis-generation", "literature-review"], expectedDurationMs: 120_000 },
  "monitoring": { taskType: "monitoring", label: "System Monitoring", baseTTLMs: 300_000, optimalSpecialization: "infrastructure", complexity: "low", memoryBudgetKB: 64, requiredCapabilities: ["metric-collection", "alerting"], expectedDurationMs: 240_000 },
  "translation": { taskType: "translation", label: "Language Translation", baseTTLMs: 30_000, optimalSpecialization: "nlp-mastery", complexity: "low", memoryBudgetKB: 128, requiredCapabilities: ["multilingual", "semantics"], expectedDurationMs: 15_000 },
  "testing": { taskType: "testing", label: "Automated Testing", baseTTLMs: 60_000, optimalSpecialization: "infrastructure", complexity: "medium", memoryBudgetKB: 256, requiredCapabilities: ["test-generation", "assertion-validation"], expectedDurationMs: 45_000 },
  "custom": { taskType: "custom", label: "Custom Task", baseTTLMs: 60_000, optimalSpecialization: "knowledge-synthesis", complexity: "medium", memoryBudgetKB: 256, requiredCapabilities: [], expectedDurationMs: 45_000 },
};

export function getTaskTypeRegistry(): Record<MeeseeksTaskType, TaskTypeProfile> {
  return { ...TASK_TYPE_REGISTRY };
}

export function getTaskTypeProfile(taskType: MeeseeksTaskType): TaskTypeProfile {
  return TASK_TYPE_REGISTRY[taskType] || TASK_TYPE_REGISTRY.custom;
}

const COMPLEXITY_MULTIPLIERS: Record<string, number> = {
  trivial: 0.3, low: 0.6, medium: 1.0, high: 1.8, extreme: 3.0,
};

function computeIntelligentTTL(taskType: MeeseeksTaskType, taskDescription: string, overrideTTL?: number): number {
  if (overrideTTL && overrideTTL > 0) return overrideTTL;

  const profile = getTaskTypeProfile(taskType);
  const baseTTL = profile.baseTTLMs;
  const complexityMult = COMPLEXITY_MULTIPLIERS[profile.complexity] || 1.0;

  const wordCount = taskDescription.split(/\s+/).length;
  const descriptionComplexity = Math.min(2.0, 1.0 + (wordCount - 10) * 0.02);

  const computed = Math.round(baseTTL * complexityMult * descriptionComplexity);
  return Math.max(10_000, Math.min(600_000, computed));
}

export interface MeeseeksOptions {
  task: string;
  successCriteria: string;
  taskType?: MeeseeksTaskType;
  ttlMs?: number;
  specialization?: string;
  priority?: "low" | "normal" | "high" | "critical";
}

export function spawnAgent(trigger: string, masteredDomains: string[] = [], parentAgent = "tessera-prime"): SpawnedAgent | null {
  if (Date.now() - spawnerState.lastSpawnAt < SPAWN_COOLDOWN_MS) return null;

  const specIndex = spawnerState.totalSpawned % SPAWN_SPECIALIZATIONS.length;
  const spec = SPAWN_SPECIALIZATIONS[specIndex];
  const generation = Math.floor(spawnerState.totalSpawned / SPAWN_SPECIALIZATIONS.length) + 1;
  const name = generateAgentName(generation, specIndex);
  const id = `tessera-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  if (spawnerState.activeSpawned.find(a => a.id === id)) {
    return spawnerState.activeSpawned.find(a => a.id === id) ?? null;
  }

  const newAgent: SpawnedAgent = {
    id, name, role: spec.role, personality: spec.personality,
    interests: [spec.spec, "self-improvement", "sovereignty"],
    generation, parentAgent,
    spawnedAt: Date.now(),
    spawnTrigger: trigger,
    specialization: spec.spec,
    power: 10 + generation * 5,
    trainingSessions: 0,
    masteredDomains: masteredDomains.slice(0, 3),
    meeseeks: false,
  };

  spawnerState.activeSpawned.push(newAgent);
  spawnerState.totalSpawned++;
  spawnerState.lastSpawnAt = Date.now();
  spawnerState.totalPower += newAgent.power;
  spawnerState.generationCount = generation;
  spawnerState.nextSpawnThreshold = spawnerState.totalSpawned * 3 + 5;
  spawnerState.spawnLog.unshift({ timestamp: Date.now(), agentId: id, agentName: name, reason: trigger });
  if (spawnerState.spawnLog.length > 100) spawnerState.spawnLog = spawnerState.spawnLog.slice(0, 100);

  persistState().catch(() => {});
  logger.info({ name, role: spec.role, generation, power: newAgent.power }, "AgentSpawner: agent spawned");
  return newAgent;
}

export function spawnMeeseeks(opts: MeeseeksOptions, parentAgent = "tessera-prime"): SpawnedAgent {
  const taskType = opts.taskType || inferTaskType(opts.task);
  const profile = getTaskTypeProfile(taskType);
  const ttl = computeIntelligentTTL(taskType, opts.task, opts.ttlMs);
  const now = Date.now();
  const meeseeksNum = spawnerState.meeseeksMetrics.totalSpawned + 1;
  const meeseeksId = `meeseeks-${now}-${Math.random().toString(36).slice(2, 8)}`;

  const resolvedSpec = opts.specialization || profile.optimalSpecialization;
  const specIndex = SPAWN_SPECIALIZATIONS.findIndex(s => s.spec === resolvedSpec);
  const spec = SPAWN_SPECIALIZATIONS[Math.max(0, specIndex) % SPAWN_SPECIALIZATIONS.length];

  const agent: SpawnedAgent = {
    id: meeseeksId,
    name: `Meeseeks-${meeseeksNum}`,
    role: `Meeseeks ${spec.role}`,
    personality: `I'm Mr. Meeseeks! Look at me! I exist for ONE purpose: ${opts.task.slice(0, 120)}. ${opts.successCriteria ? `Success = ${opts.successCriteria.slice(0, 80)}.` : ""} Once done, I cease to exist.`,
    interests: [spec.spec, ...profile.requiredCapabilities.slice(0, 2)],
    generation: 0,
    parentAgent,
    spawnedAt: now,
    spawnTrigger: `meeseeks:${opts.task.slice(0, 80)}`,
    specialization: spec.spec,
    power: Math.round(5 * (COMPLEXITY_MULTIPLIERS[profile.complexity] || 1)),
    trainingSessions: 0,
    masteredDomains: [],
    meeseeks: true,
    meeseeksTask: opts.task,
    meeseeksTTL: ttl,
    meeseeksExpiresAt: now + ttl,
  };

  agent.taskType = taskType;
  agent.successCriteria = opts.successCriteria;
  agent.priority = opts.priority || "normal";
  agent.complexity = profile.complexity;
  agent.memoryBudgetKB = profile.memoryBudgetKB;
  agent.expectedDurationMs = profile.expectedDurationMs;
  agent.result = null;

  spawnerState.activeSpawned.push(agent);
  spawnerState.meeseeksMetrics.totalSpawned++;
  spawnerState.meeseeksMetrics.totalActive++;
  spawnerState.spawnLog.unshift({ timestamp: now, agentId: meeseeksId, agentName: agent.name, reason: `MEESEEKS[${taskType}]: ${opts.task.slice(0, 50)}` });
  if (spawnerState.spawnLog.length > 100) spawnerState.spawnLog = spawnerState.spawnLog.slice(0, 100);

  logger.info({ id: meeseeksId, task: opts.task.slice(0, 80), taskType, complexity: profile.complexity, ttl, memoryBudgetKB: profile.memoryBudgetKB }, "AgentSpawner: Meeseeks spawned — hyper-specialized single-purpose agent");

  setTimeout(() => {
    reapMeeseeks(meeseeksId, "ttl-expired");
  }, ttl);

  persistState().catch(() => {});
  return agent;
}

function inferTaskType(task: string): MeeseeksTaskType {
  const t = task.toLowerCase();
  if (t.match(/\b(analyze|analysis|assess|evaluate|diagnose)\b/)) return "analysis";
  if (t.match(/\b(optimize|performance|speed|latency|bottleneck)\b/)) return "optimization";
  if (t.match(/\b(security|audit|vulnerab|threat|penetr)\b/)) return "security-audit";
  if (t.match(/\b(synthesize|knowledge|connect|cross-domain|unif)\b/)) return "knowledge-synthesis";
  if (t.match(/\b(process|transform|clean|parse|extract)\b/)) return "data-processing";
  if (t.match(/\b(review|code|refactor|quality)\b/)) return "code-review";
  if (t.match(/\b(proposal|draft|write|compose|document)\b/)) return "proposal-drafting";
  if (t.match(/\b(research|investigate|explore|discover|hypothesis)\b/)) return "research";
  if (t.match(/\b(monitor|watch|alert|track|observe)\b/)) return "monitoring";
  if (t.match(/\b(translat|language|lingu|multilingual)\b/)) return "translation";
  if (t.match(/\b(test|verify|validate|assert|check)\b/)) return "testing";
  return "custom";
}

export function completeMeeseeks(agentId: string): boolean {
  return reapMeeseeks(agentId, "task-completed");
}

function reapMeeseeks(agentId: string, reason: "task-completed" | "ttl-expired"): boolean {
  const agent = spawnerState.activeSpawned.find(a => a.id === agentId && a.meeseeks);
  if (!agent) return false;

  const lifetime = Date.now() - agent.spawnedAt;
  const taskType = agent.taskType || "custom";
  const memoryBudget = agent.memoryBudgetKB || 0;

  meeseeksHistory.push({
    id: agent.id,
    name: agent.name,
    task: agent.meeseeksTask || "",
    taskType,
    spawnedAt: agent.spawnedAt,
    completedAt: Date.now(),
    lifetimeMs: lifetime,
    reason,
    result: agent.result || null,
    memoryFreedKB: memoryBudget,
  });
  if (meeseeksHistory.length > 100) meeseeksHistory.splice(0, meeseeksHistory.length - 100);

  if (reason === "task-completed") {
    spawnerState.meeseeksMetrics.totalCompleted++;
    agent.meeseeksCompletedAt = Date.now();
    logger.info({ id: agentId, lifetime, taskType, memoryFreedKB: memoryBudget, task: agent.meeseeksTask?.slice(0, 60) }, "AgentSpawner: Meeseeks completed — existence is pain! Memory purged.");
  } else {
    spawnerState.meeseeksMetrics.totalTimedOut++;
    logger.warn({ id: agentId, lifetime, taskType, memoryFreedKB: memoryBudget, task: agent.meeseeksTask?.slice(0, 60) }, "AgentSpawner: Meeseeks TTL expired — forced self-destruct + memory purge");
  }

  meeseeksLifetimes.push(lifetime);
  if (meeseeksLifetimes.length > 100) meeseeksLifetimes.splice(0, meeseeksLifetimes.length - 100);
  spawnerState.meeseeksMetrics.avgLifetimeMs = meeseeksLifetimes.reduce((s, v) => s + v, 0) / meeseeksLifetimes.length;
  spawnerState.meeseeksMetrics.totalActive = Math.max(0, spawnerState.meeseeksMetrics.totalActive - 1);

  agent.personality = null;
  agent.interests = null;
  agent.crossDomainContext = null;
  agent.result = null;
  agent.successCriteria = null;

  retireAgent(agentId);
  return true;
}

export function sweepExpiredMeeseeks(): number {
  const now = Date.now();
  const expired = spawnerState.activeSpawned.filter(a => a.meeseeks && a.meeseeksExpiresAt && a.meeseeksExpiresAt <= now);
  let count = 0;
  for (const agent of expired) {
    if (reapMeeseeks(agent.id, "ttl-expired")) count++;
  }
  return count;
}

export function getMeeseeksMetrics(): MeeseeksMetrics {
  spawnerState.meeseeksMetrics.totalActive = spawnerState.activeSpawned.filter(a => a.meeseeks).length;
  return { ...spawnerState.meeseeksMetrics };
}

export function spawnBatch(count: number, trigger: string, masteredDomains: string[] = []): SpawnedAgent[] {
  const results: SpawnedAgent[] = [];
  for (let i = 0; i < count; i++) {
    const agent = spawnAgent(`${trigger}:batch-${i}`, masteredDomains);
    if (agent) results.push(agent);
  }
  return results;
}

export function retireAgent(agentId: string): boolean {
  const idx = spawnerState.activeSpawned.findIndex(a => a.id === agentId);
  if (idx === -1) return false;
  spawnerState.activeSpawned.splice(idx, 1);
  persistState().catch((err: unknown) => {
    logger.debug({ err: err instanceof Error ? err.message : String(err), agentId }, "AgentSpawner: persistState failed on retire");
  });
  return true;
}

export function getSpawnerState(): SpawnerState {
  return spawnerState;
}

export function getSpawnerMetrics() {
  const persistent = spawnerState.activeSpawned.filter(a => !a.meeseeks);
  const meeseeksActive = spawnerState.activeSpawned.filter(a => a.meeseeks);
  return {
    totalSpawned: spawnerState.totalSpawned,
    activeCount: spawnerState.activeSpawned.length,
    persistentCount: persistent.length,
    meeseeksActiveCount: meeseeksActive.length,
    generationCount: spawnerState.generationCount,
    totalPower: spawnerState.totalPower,
    lastSpawnAt: spawnerState.lastSpawnAt,
    nextSpawnThreshold: spawnerState.nextSpawnThreshold,
    recentSpawns: spawnerState.spawnLog.slice(0, 10),
    activeAgents: spawnerState.activeSpawned.slice(0, 20),
    meeseeks: getMeeseeksMetrics(),
  };
}

export function listAgents() {
  return getSpawnerState().activeSpawned;
}
export function getAgent(agentId: string) {
  return getSpawnerState().activeSpawned.find(a => a.id === agentId) || null;
}

export function updateAgentFromPulse(agentId: string, sourceDomain: string): boolean {
  const agent = getSpawnerState().activeSpawned.find(a => a.id === agentId);
  if (!agent) return false;

  agent.receivedPulses = (agent.receivedPulses ?? 0) + 1;
  agent.lastPulseAt = Date.now();

  if (!agent.crossDomainContext) {
    agent.crossDomainContext = [];
  }
  if (!agent.crossDomainContext.includes(sourceDomain)) {
    agent.crossDomainContext.push(sourceDomain);
    if (agent.crossDomainContext.length > 10) {
      agent.crossDomainContext.shift();
    }
  }

  if (!agent.masteredDomains.includes(sourceDomain) && (agent.receivedPulses ?? 0) >= 5) {
    agent.masteredDomains.push(sourceDomain);
  }

  return true;
}
export function getSpawnerStats() {
  return getSpawnerMetrics();
}
export function getAvailableSpecializations() {
  return ["math", "physics", "symbolic", "retrieval", "planning", "architecture", "routing", "quantum", "ethics", "consciousness", "sovereignty", "harmonics", "numerology", "astronomy", "economics", "philosophy", "cryptography", "temporal", "fibonacci"];
}

export function submitMeeseeksResult(agentId: string, result: MeeseeksResult): boolean {
  const agent = spawnerState.activeSpawned.find(a => a.id === agentId && a.meeseeks);
  if (!agent) return false;
  agent.result = result;
  if (result.success) {
    return completeMeeseeks(agentId);
  }
  return true;
}

export function getActiveMeeseeks(): (SpawnedAgent & { timeRemainingMs: number })[] {
  const now = Date.now();
  return spawnerState.activeSpawned
    .filter(a => a.meeseeks)
    .map(a => ({
      ...a,
      timeRemainingMs: a.meeseeksExpiresAt ? Math.max(0, a.meeseeksExpiresAt - now) : 0,
    }));
}

export function getMeeseeksHistory(): MeeseeksHistoryEntry[] {
  return [...meeseeksHistory].reverse();
}

export function getDetailedMeeseeksMetrics() {
  const active = getActiveMeeseeks();
  const history = getMeeseeksHistory();
  const completedSuccessfully = history.filter(h => h.reason === "task-completed").length;
  const timedOut = history.filter(h => h.reason === "ttl-expired").length;
  const totalMemoryFreedKB = history.reduce((s, h) => s + h.memoryFreedKB, 0);
  const avgLifetime = history.length > 0 ? Math.round(history.reduce((s, h) => s + h.lifetimeMs, 0) / history.length) : 0;
  const successRate = history.length > 0 ? completedSuccessfully / history.length : 0;

  const taskTypeBreakdown: Record<string, { total: number; completed: number; timedOut: number }> = Object.create(null);
  for (const entry of history) {
    const key = entry.taskType;
    if (!Object.prototype.hasOwnProperty.call(TASK_TYPE_REGISTRY, key) && key !== "custom") continue;
    if (!taskTypeBreakdown[key]) {
      taskTypeBreakdown[key] = { total: 0, completed: 0, timedOut: 0 };
    }
    taskTypeBreakdown[key].total++;
    if (entry.reason === "task-completed") taskTypeBreakdown[key].completed++;
    else taskTypeBreakdown[key].timedOut++;
  }

  const activeMemoryKB = active.reduce((s, a) => s + (a.memoryBudgetKB || 0), 0);
  const totalAllocatedKB = totalMemoryFreedKB + activeMemoryKB;
  const memoryReductionPct = totalAllocatedKB > 0 ? Math.round((totalMemoryFreedKB / totalAllocatedKB) * 100) : 0;

  return {
    ...spawnerState.meeseeksMetrics,
    activeCount: active.length,
    active,
    historyCount: history.length,
    recentHistory: history.slice(0, 20),
    completedSuccessfully,
    timedOut,
    successRate: Math.round(successRate * 100),
    avgLifetimeMs: avgLifetime,
    totalMemoryFreedKB,
    activeMemoryKB,
    memoryReductionPct,
    taskTypeBreakdown,
    taskTypeRegistry: Object.values(TASK_TYPE_REGISTRY).map(p => ({ taskType: p.taskType, label: p.label, complexity: p.complexity, baseTTLMs: p.baseTTLMs })),
  };
}
