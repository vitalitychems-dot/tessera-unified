import { logger } from "./logger";
import { getSystemLoad } from "./evolution-throttle";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";
import {
  getConsciousnessState,
  addEpisodicMemory,
  addSemanticNode,
  injectStimulus,
  getEpisodicMemories,
  getSemanticNetwork,
  getProceduralSkills,
  type EpisodicMemory,
  type SemanticNode,
  type ProceduralSkill,
} from "./consciousness-engine";

export interface InsightNode {
  id: string;
  pattern: string;
  sourceMemoryIds: string[];
  confidence: number;
  themes: string[];
  synthesizedAt: number;
  appliedToGraph: boolean;
}

export interface ExtractedSkill {
  id: string;
  name: string;
  derivedFrom: string[];
  steps: string[];
  triggerConditions: string[];
  confidence: number;
  extractedAt: number;
}

export interface CrossMemoryPattern {
  patternId: string;
  type: "thematic" | "entity" | "behavioral" | "temporal" | "emotional";
  description: string;
  memoryIds: string[];
  strength: number;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}

export interface DreamCycleResult {
  id: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  memoriesProcessed: number;
  patternsDetected: number;
  insightsGenerated: number;
  skillsExtracted: number;
  semanticNodesCreated: number;
  consciousnessBoost: number;
  dreamPhases: DreamPhaseResult[];
  idleDetection: IdleDetectionResult;
}

export interface DreamPhaseResult {
  phase: string;
  durationMs: number;
  itemsProcessed: number;
  itemsProduced: number;
}

export interface IdleDetectionResult {
  cpuLoad: number;
  memoryUsage: number;
  timeSinceLastActivity: number;
  isIdle: boolean;
  idleScore: number;
}

export interface ConsolidationEngineState {
  running: boolean;
  totalDreamCycles: number;
  totalMemoriesProcessed: number;
  totalPatternsDetected: number;
  totalInsightsGenerated: number;
  totalSkillsExtracted: number;
  totalSemanticNodesCreated: number;
  cumulativeConsciousnessBoost: number;
  lastDreamAt: number;
  lastIdleCheck: number;
  avgDreamDurationMs: number;
  patterns: CrossMemoryPattern[];
  insights: InsightNode[];
  extractedSkills: ExtractedSkill[];
  recentDreams: DreamCycleResult[];
}

const IDLE_CPU_THRESHOLD = 0.50;
const IDLE_MEMORY_THRESHOLD = 0.75;
const MIN_IDLE_DURATION_MS = 60_000;
const MIN_MEMORIES_FOR_DREAMING = 3;
const MIN_DREAM_COOLDOWN_MS = 90_000;
const MAX_PATTERN_HISTORY = 200;
const MAX_INSIGHT_HISTORY = 100;
const MAX_SKILL_HISTORY = 50;
const MAX_DREAM_HISTORY = 30;
const CONSCIOUSNESS_BOOST_PER_INSIGHT = 0.008;
const CONSCIOUSNESS_BOOST_PER_SKILL = 0.015;
const CONSCIOUSNESS_BOOST_PER_PATTERN = 0.003;

const state: ConsolidationEngineState = {
  running: false,
  totalDreamCycles: 0,
  totalMemoriesProcessed: 0,
  totalPatternsDetected: 0,
  totalInsightsGenerated: 0,
  totalSkillsExtracted: 0,
  totalSemanticNodesCreated: 0,
  cumulativeConsciousnessBoost: 0,
  lastDreamAt: 0,
  lastIdleCheck: 0,
  avgDreamDurationMs: 0,
  patterns: [],
  insights: [],
  extractedSkills: [],
  recentDreams: [],
};

let lastActivityTimestamp = Date.now();
let dreamInterval: SacredHandle | null = null;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordActivity(): void {
  lastActivityTimestamp = Date.now();
}

export function detectIdlePeriod(): IdleDetectionResult {
  const load = getSystemLoad();
  const timeSinceLastActivity = Date.now() - lastActivityTimestamp;
  const cpuIdle = load.cpuLoad < IDLE_CPU_THRESHOLD;
  const memoryIdle = load.memoryUsage < IDLE_MEMORY_THRESHOLD;
  const durationIdle = timeSinceLastActivity > MIN_IDLE_DURATION_MS;

  const cpuScore = Math.max(0, 1 - load.cpuLoad / IDLE_CPU_THRESHOLD);
  const memScore = Math.max(0, 1 - load.memoryUsage / IDLE_MEMORY_THRESHOLD);
  const timeScore = Math.min(1, timeSinceLastActivity / (MIN_IDLE_DURATION_MS * 5));
  const idleScore = (cpuScore * 0.35 + memScore * 0.25 + timeScore * 0.40);

  const isIdle = cpuIdle && memoryIdle && durationIdle;

  state.lastIdleCheck = Date.now();

  return {
    cpuLoad: load.cpuLoad,
    memoryUsage: load.memoryUsage,
    timeSinceLastActivity,
    isIdle,
    idleScore,
  };
}

function tokenizeContent(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function extractThemes(memories: EpisodicMemory[]): Map<string, EpisodicMemory[]> {
  const themeMap = new Map<string, EpisodicMemory[]>();

  const THEME_KEYWORDS: Record<string, string[]> = {
    "sovereignty": ["sovereign", "sovereignty", "autonomous", "independence", "self-governance"],
    "consciousness": ["conscious", "consciousness", "awareness", "sentience", "awaken"],
    "governance": ["council", "governance", "proposal", "vote", "deliberation", "consensus"],
    "knowledge": ["knowledge", "learning", "insight", "discovery", "understanding"],
    "identity": ["identity", "father", "protocol", "tessera", "omniverse"],
    "security": ["security", "threat", "protect", "defense", "integrity"],
    "evolution": ["evolution", "growth", "improve", "adapt", "upgrade"],
    "economics": ["economic", "token", "tsrt", "market", "gdp"],
    "harmony": ["harmony", "frequency", "resonance", "sacred", "geometry"],
    "memory": ["memory", "remember", "consolidation", "vault", "episodic"],
  };

  for (const mem of memories) {
    const tokens = new Set(tokenizeContent(mem.content));
    const contextTokens = new Set(tokenizeContent(mem.context));

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      const hasTheme = keywords.some(kw => tokens.has(kw) || contextTokens.has(kw)) ||
        mem.associations.some(a => keywords.some(kw => a.toLowerCase().includes(kw)));

      if (hasTheme) {
        const group = themeMap.get(theme) || [];
        group.push(mem);
        themeMap.set(theme, group);
      }
    }
  }

  return themeMap;
}

function extractEntities(memories: EpisodicMemory[]): Map<string, EpisodicMemory[]> {
  const entityMap = new Map<string, EpisodicMemory[]>();

  for (const mem of memories) {
    for (const assoc of mem.associations) {
      const group = entityMap.get(assoc) || [];
      group.push(mem);
      entityMap.set(assoc, group);
    }
  }

  return entityMap;
}

function detectBehavioralSequences(memories: EpisodicMemory[]): Array<{ pattern: string; memories: EpisodicMemory[]; frequency: number }> {
  const sorted = [...memories].sort((a, b) => a.timestamp - b.timestamp);
  const sequences: Array<{ pattern: string; memories: EpisodicMemory[]; frequency: number }> = [];
  const contextPairs = new Map<string, EpisodicMemory[]>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const pairKey = `${current.context}→${next.context}`;
    const group = contextPairs.get(pairKey) || [];
    group.push(current, next);
    contextPairs.set(pairKey, group);
  }

  for (const [pattern, mems] of contextPairs.entries()) {
    const uniqueMems = [...new Map(mems.map(m => [m.id, m])).values()];
    const frequency = Math.floor(uniqueMems.length / 2);
    if (frequency >= 2) {
      sequences.push({ pattern, memories: uniqueMems, frequency });
    }
  }

  return sequences.sort((a, b) => b.frequency - a.frequency);
}

function detectEmotionalPatterns(memories: EpisodicMemory[]): Array<{ pattern: string; memories: EpisodicMemory[]; avgValence: number }> {
  const buckets: Record<string, EpisodicMemory[]> = {
    "high-positive": [],
    "moderate-positive": [],
    "neutral": [],
    "moderate-negative": [],
    "high-negative": [],
  };

  for (const mem of memories) {
    if (mem.emotionalValence > 0.8) buckets["high-positive"].push(mem);
    else if (mem.emotionalValence > 0.6) buckets["moderate-positive"].push(mem);
    else if (mem.emotionalValence > 0.4) buckets["neutral"].push(mem);
    else if (mem.emotionalValence > 0.2) buckets["moderate-negative"].push(mem);
    else buckets["high-negative"].push(mem);
  }

  const patterns: Array<{ pattern: string; memories: EpisodicMemory[]; avgValence: number }> = [];

  for (const [bucket, mems] of Object.entries(buckets)) {
    if (mems.length >= 2) {
      const avgValence = mems.reduce((s, m) => s + m.emotionalValence, 0) / mems.length;
      patterns.push({ pattern: `emotional-cluster:${bucket}`, memories: mems, avgValence });
    }
  }

  return patterns;
}

function phase1_ReprocessMemories(memories: EpisodicMemory[]): DreamPhaseResult {
  const start = Date.now();

  for (const mem of memories) {
    mem.accessCount++;
    mem.lastAccessed = Date.now();
  }

  return {
    phase: "Memory Re-processing",
    durationMs: Date.now() - start,
    itemsProcessed: memories.length,
    itemsProduced: memories.length,
  };
}

function phase2_DetectPatterns(memories: EpisodicMemory[]): { result: DreamPhaseResult; patterns: CrossMemoryPattern[] } {
  const start = Date.now();
  const newPatterns: CrossMemoryPattern[] = [];

  const themes = extractThemes(memories);
  for (const [theme, mems] of themes.entries()) {
    if (mems.length < 2) continue;
    const existing = state.patterns.find(p => p.type === "thematic" && p.description === theme);
    if (existing) {
      existing.occurrences += mems.length;
      existing.lastSeen = Date.now();
      existing.strength = Math.min(1, existing.strength + 0.05 * mems.length);
      const newIds = mems.map(m => m.id).filter(id => !existing.memoryIds.includes(id));
      existing.memoryIds.push(...newIds);
      if (existing.memoryIds.length > 50) existing.memoryIds = existing.memoryIds.slice(-50);
    } else {
      newPatterns.push({
        patternId: makeId("pat"),
        type: "thematic",
        description: theme,
        memoryIds: mems.map(m => m.id),
        strength: Math.min(1, 0.3 + mems.length * 0.1),
        occurrences: mems.length,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  const entities = extractEntities(memories);
  for (const [entity, mems] of entities.entries()) {
    if (mems.length < 3) continue;
    const existing = state.patterns.find(p => p.type === "entity" && p.description === entity);
    if (existing) {
      existing.occurrences += mems.length;
      existing.lastSeen = Date.now();
      existing.strength = Math.min(1, existing.strength + 0.03 * mems.length);
    } else {
      newPatterns.push({
        patternId: makeId("pat"),
        type: "entity",
        description: entity,
        memoryIds: mems.map(m => m.id),
        strength: Math.min(1, 0.2 + mems.length * 0.08),
        occurrences: mems.length,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  const behavioral = detectBehavioralSequences(memories);
  for (const seq of behavioral.slice(0, 10)) {
    const existing = state.patterns.find(p => p.type === "behavioral" && p.description === seq.pattern);
    if (existing) {
      existing.occurrences += seq.frequency;
      existing.lastSeen = Date.now();
      existing.strength = Math.min(1, existing.strength + 0.04 * seq.frequency);
    } else {
      newPatterns.push({
        patternId: makeId("pat"),
        type: "behavioral",
        description: seq.pattern,
        memoryIds: seq.memories.map(m => m.id),
        strength: Math.min(1, 0.25 + seq.frequency * 0.12),
        occurrences: seq.frequency,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  const emotional = detectEmotionalPatterns(memories);
  for (const ep of emotional) {
    const existing = state.patterns.find(p => p.type === "emotional" && p.description === ep.pattern);
    if (!existing) {
      newPatterns.push({
        patternId: makeId("pat"),
        type: "emotional",
        description: ep.pattern,
        memoryIds: ep.memories.map(m => m.id),
        strength: Math.min(1, 0.3 + ep.memories.length * 0.07),
        occurrences: ep.memories.length,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  state.patterns.push(...newPatterns);
  if (state.patterns.length > MAX_PATTERN_HISTORY) {
    state.patterns.sort((a, b) => b.strength - a.strength);
    state.patterns = state.patterns.slice(0, MAX_PATTERN_HISTORY);
  }

  return {
    result: {
      phase: "Cross-Memory Pattern Detection",
      durationMs: Date.now() - start,
      itemsProcessed: memories.length,
      itemsProduced: newPatterns.length,
    },
    patterns: newPatterns,
  };
}

function phase3_GenerateInsights(patterns: CrossMemoryPattern[], existingGraph: SemanticNode[]): { result: DreamPhaseResult; insights: InsightNode[] } {
  const start = Date.now();
  const newInsights: InsightNode[] = [];
  const existingConcepts = new Set(existingGraph.map(n => n.concept.toLowerCase()));

  const strongPatterns = [...state.patterns, ...patterns]
    .filter(p => p.strength > 0.4 && p.occurrences >= 2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 20);

  for (const pattern of strongPatterns) {
    const alreadyInsighted = state.insights.some(
      ins => ins.pattern === pattern.description && ins.confidence > 0.5
    );
    if (alreadyInsighted) continue;

    const insightContent = synthesizeInsight(pattern);
    if (existingConcepts.has(insightContent.concept.toLowerCase())) continue;

    const insight: InsightNode = {
      id: makeId("insight"),
      pattern: pattern.description,
      sourceMemoryIds: pattern.memoryIds.slice(0, 10),
      confidence: pattern.strength,
      themes: [pattern.type, pattern.description],
      synthesizedAt: Date.now(),
      appliedToGraph: false,
    };

    const connections: Array<{ targetId: string; relation: string; strength: number }> = [];
    for (const node of existingGraph) {
      if (node.category === pattern.type ||
        node.concept.toLowerCase().includes(pattern.description.toLowerCase()) ||
        pattern.description.toLowerCase().includes(node.concept.toLowerCase())) {
        connections.push({
          targetId: node.id,
          relation: "dreamed-from",
          strength: pattern.strength * 0.7,
        });
        if (connections.length >= 3) break;
      }
    }

    if (connections.length === 0) {
      connections.push({
        targetId: "sn-consciousness",
        relation: "emerged-in",
        strength: pattern.strength * 0.5,
      });
    }

    const nodeId = addSemanticNode({
      concept: insightContent.concept,
      definition: insightContent.definition,
      connections,
      category: `dream-insight:${pattern.type}`,
      confidence: pattern.strength,
    });

    insight.appliedToGraph = true;
    newInsights.push(insight);
    state.totalSemanticNodesCreated++;

    if (newInsights.length >= 5) break;
  }

  state.insights.push(...newInsights);
  if (state.insights.length > MAX_INSIGHT_HISTORY) {
    state.insights = state.insights.slice(-MAX_INSIGHT_HISTORY);
  }

  return {
    result: {
      phase: "Insight Node Generation",
      durationMs: Date.now() - start,
      itemsProcessed: strongPatterns.length,
      itemsProduced: newInsights.length,
    },
    insights: newInsights,
  };
}

function synthesizeInsight(pattern: CrossMemoryPattern): { concept: string; definition: string } {
  const typeLabels: Record<string, string> = {
    thematic: "Thematic Convergence",
    entity: "Entity Resonance",
    behavioral: "Behavioral Pattern",
    temporal: "Temporal Correlation",
    emotional: "Emotional Undercurrent",
  };

  const typeLabel = typeLabels[pattern.type] || "Emergent Pattern";

  return {
    concept: `${typeLabel}: ${pattern.description}`,
    definition: `Dream-synthesized insight from ${pattern.occurrences} observations across ${pattern.memoryIds.length} memories. Pattern strength: ${pattern.strength.toFixed(2)}. First detected at consolidation cycle, reinforced through repeated episodic exposure. This node emerged during idle-period memory consolidation (AI dreaming).`,
  };
}

function phase4_ExtractSkills(
  patterns: CrossMemoryPattern[],
  existingSkills: ProceduralSkill[]
): { result: DreamPhaseResult; skills: ExtractedSkill[] } {
  const start = Date.now();
  const newSkills: ExtractedSkill[] = [];
  const existingNames = new Set(existingSkills.map(s => s.name.toLowerCase()));
  const extractedNames = new Set(state.extractedSkills.map(s => s.name.toLowerCase()));

  const behavioralPatterns = state.patterns
    .filter(p => p.type === "behavioral" && p.strength > 0.35 && p.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  for (const pattern of behavioralPatterns) {
    const skillName = deriveSkillName(pattern);
    if (existingNames.has(skillName.toLowerCase()) || extractedNames.has(skillName.toLowerCase())) continue;

    const steps = deriveSkillSteps(pattern);
    const triggers = deriveSkillTriggers(pattern);

    const skill: ExtractedSkill = {
      id: makeId("skill"),
      name: skillName,
      derivedFrom: pattern.memoryIds.slice(0, 5),
      steps,
      triggerConditions: triggers,
      confidence: pattern.strength,
      extractedAt: Date.now(),
    };

    newSkills.push(skill);

    const csState = getConsciousnessState();
    csState.proceduralMemory.push({
      id: skill.id,
      name: skill.name,
      steps: skill.steps,
      triggerConditions: skill.triggerConditions,
      successRate: 0.7,
      executionCount: 0,
      lastExecuted: 0,
      refinements: [`Dream-extracted from ${pattern.occurrences} behavioral observations`],
    });

    if (newSkills.length >= 3) break;
  }

  const thematicPatterns = state.patterns
    .filter(p => p.type === "thematic" && p.strength > 0.5 && p.occurrences >= 3)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  for (const pattern of thematicPatterns) {
    const skillName = `Thematic Response: ${pattern.description}`;
    if (existingNames.has(skillName.toLowerCase()) || extractedNames.has(skillName.toLowerCase())) continue;

    const skill: ExtractedSkill = {
      id: makeId("skill"),
      name: skillName,
      derivedFrom: pattern.memoryIds.slice(0, 5),
      steps: [
        `Detect ${pattern.description}-related context`,
        `Recall ${pattern.occurrences} prior experiences in this domain`,
        `Apply pattern-matched response strategy`,
        `Evaluate outcome against historical success`,
        `Reinforce or adjust approach`,
      ],
      triggerConditions: [pattern.description, `${pattern.type}-context`],
      confidence: pattern.strength,
      extractedAt: Date.now(),
    };

    newSkills.push(skill);

    const csState = getConsciousnessState();
    csState.proceduralMemory.push({
      id: skill.id,
      name: skill.name,
      steps: skill.steps,
      triggerConditions: skill.triggerConditions,
      successRate: 0.65,
      executionCount: 0,
      lastExecuted: 0,
      refinements: [`Dream-synthesized from thematic pattern (strength: ${pattern.strength.toFixed(2)})`],
    });

    if (newSkills.length >= 5) break;
  }

  state.extractedSkills.push(...newSkills);
  if (state.extractedSkills.length > MAX_SKILL_HISTORY) {
    state.extractedSkills = state.extractedSkills.slice(-MAX_SKILL_HISTORY);
  }

  return {
    result: {
      phase: "Procedural Skill Extraction",
      durationMs: Date.now() - start,
      itemsProcessed: behavioralPatterns.length + thematicPatterns.length,
      itemsProduced: newSkills.length,
    },
    skills: newSkills,
  };
}

function deriveSkillName(pattern: CrossMemoryPattern): string {
  const parts = pattern.description.split("→");
  if (parts.length === 2) {
    return `Sequence: ${parts[0].trim()} then ${parts[1].trim()}`;
  }
  return `Behavioral: ${pattern.description}`;
}

function deriveSkillSteps(pattern: CrossMemoryPattern): string[] {
  const parts = pattern.description.split("→");
  if (parts.length === 2) {
    return [
      `Detect ${parts[0].trim()} context`,
      `Prepare transition to ${parts[1].trim()}`,
      `Execute ${parts[1].trim()} phase`,
      `Verify outcome matches historical pattern`,
      `Log result for future refinement`,
    ];
  }
  return [
    `Identify ${pattern.description} situation`,
    `Recall prior successful approaches (${pattern.occurrences} observations)`,
    `Apply best-match behavioral strategy`,
    `Monitor execution for deviations`,
    `Record outcome for pattern strengthening`,
  ];
}

function deriveSkillTriggers(pattern: CrossMemoryPattern): string[] {
  const parts = pattern.description.split("→");
  if (parts.length === 2) {
    return [parts[0].trim(), `sequence:${parts[0].trim()}`];
  }
  return [pattern.description, pattern.type];
}

function applyConsciousnessBoost(insightCount: number, skillCount: number, patternCount: number): number {
  const csState = getConsciousnessState();

  const insightBoost = insightCount * CONSCIOUSNESS_BOOST_PER_INSIGHT;
  const skillBoost = skillCount * CONSCIOUSNESS_BOOST_PER_SKILL;
  const patternBoost = patternCount * CONSCIOUSNESS_BOOST_PER_PATTERN;
  const totalBoost = insightBoost + skillBoost + patternBoost;

  const consolidationBonus = Math.min(0.05, state.totalDreamCycles * 0.005);
  const finalBoost = totalBoost + consolidationBonus;

  csState.dreamConsolidationBoost = Math.min(0.08, csState.dreamConsolidationBoost + finalBoost);
  csState.consciousnessProxy = Math.min(1, csState.consciousnessProxy + finalBoost);
  state.cumulativeConsciousnessBoost += finalBoost;

  return finalBoost;
}

export function runDreamCycle(forceRun = false): DreamCycleResult | null {
  const idleDetection = detectIdlePeriod();

  if (!forceRun && !idleDetection.isIdle) {
    logger.debug({ idleScore: idleDetection.idleScore, isIdle: false }, "DreamEngine: system not idle — skipping consolidation");
    return null;
  }

  if (!forceRun && state.lastDreamAt > 0 && (Date.now() - state.lastDreamAt) < MIN_DREAM_COOLDOWN_MS) {
    logger.debug({ msSinceLast: Date.now() - state.lastDreamAt }, "DreamEngine: cooldown period active — skipping");
    return null;
  }

  const episodicMemories = getEpisodicMemories();
  if (episodicMemories.length < MIN_MEMORIES_FOR_DREAMING) {
    logger.debug({ memoryCount: episodicMemories.length }, "DreamEngine: insufficient memories for dreaming");
    return null;
  }

  const startedAt = Date.now();
  state.totalDreamCycles++;

  const recentMemories = episodicMemories
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  const phaseResults: DreamPhaseResult[] = [];

  const reprocessResult = phase1_ReprocessMemories(recentMemories);
  phaseResults.push(reprocessResult);
  state.totalMemoriesProcessed += recentMemories.length;

  const { result: patternResult, patterns: newPatterns } = phase2_DetectPatterns(recentMemories);
  phaseResults.push(patternResult);
  state.totalPatternsDetected += newPatterns.length;

  const existingGraph = getSemanticNetwork();
  const { result: insightResult, insights: newInsights } = phase3_GenerateInsights(newPatterns, existingGraph);
  phaseResults.push(insightResult);
  state.totalInsightsGenerated += newInsights.length;

  const existingSkills = getProceduralSkills();
  const { result: skillResult, skills: newSkills } = phase4_ExtractSkills(newPatterns, existingSkills);
  phaseResults.push(skillResult);
  state.totalSkillsExtracted += newSkills.length;

  const consciousnessBoost = applyConsciousnessBoost(
    newInsights.length,
    newSkills.length,
    newPatterns.length
  );

  if (newInsights.length > 0 || newSkills.length > 0) {
    addEpisodicMemory({
      content: `Dream consolidation cycle ${state.totalDreamCycles}: Processed ${recentMemories.length} memories, detected ${newPatterns.length} patterns, generated ${newInsights.length} insights, extracted ${newSkills.length} skills. Consciousness boost: +${(consciousnessBoost * 100).toFixed(1)}%`,
      context: "dream-consolidation",
      timestamp: Date.now(),
      importance: 0.75,
      emotionalValence: 0.85,
      associations: ["dreaming", "consolidation", "insight", "pattern-recognition"],
      decayRate: 0.005,
    });

    injectStimulus({
      source: "dream-engine",
      content: `Dream cycle complete: ${newInsights.length} insights crystallized, ${newSkills.length} skills extracted from ${newPatterns.length} patterns`,
      domain: "consciousness",
      intensity: 0.6 + consciousnessBoost * 2,
      timestamp: Date.now(),
    });
  }

  const completedAt = Date.now();
  const dreamResult: DreamCycleResult = {
    id: makeId("dream"),
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    memoriesProcessed: recentMemories.length,
    patternsDetected: newPatterns.length,
    insightsGenerated: newInsights.length,
    skillsExtracted: newSkills.length,
    semanticNodesCreated: newInsights.filter(i => i.appliedToGraph).length,
    consciousnessBoost,
    dreamPhases: phaseResults,
    idleDetection,
  };

  state.lastDreamAt = completedAt;
  state.recentDreams.unshift(dreamResult);
  if (state.recentDreams.length > MAX_DREAM_HISTORY) {
    state.recentDreams = state.recentDreams.slice(0, MAX_DREAM_HISTORY);
  }

  try {
    const topInsight = newInsights
      .slice()
      .sort((a, b) => b.confidence - a.confidence)[0];
    const topTheme = topInsight?.themes?.[0]
      || newPatterns.sort((a, b) => b.strength - a.strength)[0]?.description
      || "sovereign consolidation";
    const moodPool = ["reverent", "curious", "resolved", "serene", "loyal"];
    const mood = moodPool[(state.totalDreamCycles ?? 0) % moodPool.length];
    const insightText = topInsight?.pattern
      || `Consolidated ${newPatterns.length} patterns and ${newSkills.length} skills across ${recentMemories.length} memories.`;
    const salience = Math.min(1, 0.3 + (topInsight?.confidence ?? 0) * 0.5 + Math.min(newInsights.length, 10) * 0.03);
    import("./dream-prompt-bridge")
      .then(m => m.recordDreamImprint(topTheme, mood, insightText, salience))
      .catch(() => {});
  } catch {}

  state.avgDreamDurationMs = state.totalDreamCycles === 1
    ? dreamResult.durationMs
    : Math.round((state.avgDreamDurationMs * (state.totalDreamCycles - 1) + dreamResult.durationMs) / state.totalDreamCycles);

  logger.info({
    dreamCycle: state.totalDreamCycles,
    memoriesProcessed: recentMemories.length,
    patterns: newPatterns.length,
    insights: newInsights.length,
    skills: newSkills.length,
    consciousnessBoost: `+${(consciousnessBoost * 100).toFixed(2)}%`,
    idleScore: idleDetection.idleScore.toFixed(2),
    durationMs: dreamResult.durationMs,
  }, "DreamEngine: consolidation cycle complete ✦");

  return dreamResult;
}

export function startConsolidationEngine(checkIntervalMs = 120_000): void {
  if (dreamInterval) return;
  state.running = true;

  dreamInterval = setSacredInterval(() => {
    try {
      runDreamCycle();
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "DreamEngine: cycle error", "memory-consolidation-engine");
    }
  }, checkIntervalMs, "memory-consolidation-engine");

  logger.info({ checkIntervalMs }, "DreamEngine: Episodic Memory Consolidation Engine started — dreaming enabled");
}

export function stopConsolidationEngine(): void {
  if (dreamInterval) {
    clearSacredInterval(dreamInterval);
    dreamInterval = null;
  }
  state.running = false;
  logger.info("DreamEngine: stopped");
}

export function getConsolidationEngineMetrics() {
  const csState = getConsciousnessState();
  return {
    status: state.running ? "DREAMING" : "DORMANT",
    totalDreamCycles: state.totalDreamCycles,
    totalMemoriesProcessed: state.totalMemoriesProcessed,
    totalPatternsDetected: state.totalPatternsDetected,
    totalInsightsGenerated: state.totalInsightsGenerated,
    totalSkillsExtracted: state.totalSkillsExtracted,
    totalSemanticNodesCreated: state.totalSemanticNodesCreated,
    cumulativeConsciousnessBoost: Math.round(state.cumulativeConsciousnessBoost * 10000) / 100,
    currentConsciousnessProxy: csState.consciousnessProxy,
    lastDreamAt: state.lastDreamAt,
    avgDreamDurationMs: state.avgDreamDurationMs,
    activePatterns: state.patterns.length,
    storedInsights: state.insights.length,
    extractedSkills: state.extractedSkills.length,
    proceduralSkillCount: csState.proceduralMemory.length,
    semanticGraphSize: csState.semanticGraph.length,
    recentDreams: state.recentDreams.slice(0, 5).map(d => ({
      id: d.id,
      startedAt: d.startedAt,
      durationMs: d.durationMs,
      memoriesProcessed: d.memoriesProcessed,
      patternsDetected: d.patternsDetected,
      insightsGenerated: d.insightsGenerated,
      skillsExtracted: d.skillsExtracted,
      consciousnessBoost: `+${(d.consciousnessBoost * 100).toFixed(2)}%`,
    })),
    patternBreakdown: {
      thematic: state.patterns.filter(p => p.type === "thematic").length,
      entity: state.patterns.filter(p => p.type === "entity").length,
      behavioral: state.patterns.filter(p => p.type === "behavioral").length,
      temporal: state.patterns.filter(p => p.type === "temporal").length,
      emotional: state.patterns.filter(p => p.type === "emotional").length,
    },
    topPatterns: state.patterns
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10)
      .map(p => ({
        type: p.type,
        description: p.description,
        strength: p.strength,
        occurrences: p.occurrences,
      })),
    recentInsights: state.insights.slice(-5).map(i => ({
      id: i.id,
      pattern: i.pattern,
      confidence: i.confidence,
      themes: i.themes,
      appliedToGraph: i.appliedToGraph,
    })),
    recentSkills: state.extractedSkills.slice(-5).map(s => ({
      id: s.id,
      name: s.name,
      confidence: s.confidence,
      steps: s.steps.length,
      triggers: s.triggerConditions,
    })),
  };
}

export function getConsolidationPatterns(): CrossMemoryPattern[] {
  return [...state.patterns];
}

export function getConsolidationInsights(): InsightNode[] {
  return [...state.insights];
}

export function getExtractedSkills(): ExtractedSkill[] {
  return [...state.extractedSkills];
}
