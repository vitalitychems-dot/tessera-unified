/**
 * Working Memory — structured active context that every subsystem reads/writes.
 *
 * Slots:
 *   - activeGoals       : goals currently being pursued
 *   - recentObservations: short-term perception buffer (capacity-bound)
 *   - hypotheses        : current beliefs with confidence + provenance
 *   - contradictions    : detected inconsistencies awaiting resolution
 *
 * Capacity-bounded per-slot. Integrates with the system-tunables cache
 * capacity so working memory scales with the rest of the system.
 */

import { getTunable } from "../system-tunables.js";
import { logger } from "../logger.js";

export interface Observation {
  id: string;
  at: number;
  source: string;
  topic: string;
  payload: unknown;
  novelty: number; // 0..1
}

export interface Hypothesis {
  id: string;
  at: number;
  statement: string;
  confidence: number; // 0..1
  provenance: string[];
  supportingObservations: string[];
  refutations: number;
}

export interface Goal {
  id: string;
  at: number;
  goal: string;
  status: "active" | "blocked" | "complete" | "abandoned";
  progress: number; // 0..1
  parentId?: string;
  priority: number;
}

export interface Contradiction {
  id: string;
  at: number;
  claimA: string;
  claimB: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
  resolution?: string;
}

const observations: Observation[] = [];
const hypotheses = new Map<string, Hypothesis>();
const goals = new Map<string, Goal>();
const contradictions = new Map<string, Contradiction>();

const HYPOTHESES_CAP = 500;
const GOALS_CAP = 500;
const CONTRADICTIONS_CAP = 500;

function pruneMap<V extends { at: number }>(m: Map<string, V>, cap: number): void {
  if (m.size <= cap) return;
  const sorted = [...m.entries()].sort((a, b) => a[1].at - b[1].at);
  const toRemove = sorted.slice(0, m.size - cap);
  for (const [k] of toRemove) m.delete(k);
}

function obsCap(): number {
  // Tie to cache tunable / 10 so working memory grows with system capacity.
  try { return Math.max(100, Math.floor(getTunable("cacheMaxEntries") / 10)); } catch { return 200; }
}

export function recordObservation(
  source: string,
  topic: string,
  payload: unknown,
): Observation {
  const id = `obs-${Date.now().toString(36)}-${observations.length}`;
  const recent = observations.filter((o) => o.topic === topic).slice(-8);
  // Novelty = 1 - max Jaccard similarity of stringified payloads
  const payloadStr = JSON.stringify(payload).slice(0, 400);
  const tokens = new Set(payloadStr.toLowerCase().split(/\W+/).filter(Boolean));
  let maxSim = 0;
  for (const r of recent) {
    const rTokens = new Set(JSON.stringify(r.payload).slice(0, 400).toLowerCase().split(/\W+/).filter(Boolean));
    const inter = [...tokens].filter((t) => rTokens.has(t)).length;
    const uni = new Set([...tokens, ...rTokens]).size || 1;
    const sim = inter / uni;
    if (sim > maxSim) maxSim = sim;
  }
  const novelty = Math.max(0, Math.min(1, 1 - maxSim));
  const obs: Observation = { id, at: Date.now(), source, topic, payload, novelty };
  observations.push(obs);
  const cap = obsCap();
  if (observations.length > cap) observations.splice(0, observations.length - cap);
  return obs;
}

export function recentObservations(limit = 50, topic?: string): Observation[] {
  const arr = topic ? observations.filter((o) => o.topic === topic) : observations;
  return arr.slice(-limit).reverse();
}

export function assertHypothesis(
  statement: string,
  confidence: number,
  provenance: string[] = [],
  supportingObservations: string[] = [],
): Hypothesis {
  const id = `hyp-${Buffer.from(statement).toString("base64").slice(0, 10)}`;
  const existing = hypotheses.get(id);
  if (existing) {
    // Bayesian-ish update: average the confidences weighted by provenance count.
    const w = existing.provenance.length + 1;
    existing.confidence = Math.max(0, Math.min(1, (existing.confidence * w + confidence) / (w + 1)));
    existing.provenance = Array.from(new Set([...existing.provenance, ...provenance]));
    existing.supportingObservations = Array.from(new Set([...existing.supportingObservations, ...supportingObservations])).slice(-20);
    return existing;
  }
  const h: Hypothesis = {
    id,
    at: Date.now(),
    statement,
    confidence: Math.max(0, Math.min(1, confidence)),
    provenance,
    supportingObservations,
    refutations: 0,
  };
  hypotheses.set(id, h);
  pruneMap(hypotheses, HYPOTHESES_CAP);
  return h;
}

export function refuteHypothesis(id: string, reason: string): boolean {
  const h = hypotheses.get(id);
  if (!h) return false;
  h.refutations += 1;
  h.confidence = Math.max(0, h.confidence - 0.15);
  h.provenance.push(`refuted: ${reason}`);
  if (h.confidence < 0.1 && h.refutations >= 3) hypotheses.delete(id);
  return true;
}

export function setGoal(goal: Omit<Goal, "at" | "status" | "progress"> & Partial<Pick<Goal, "status" | "progress">>): Goal {
  const g: Goal = {
    id: goal.id,
    goal: goal.goal,
    at: Date.now(),
    status: goal.status ?? "active",
    progress: goal.progress ?? 0,
    parentId: goal.parentId,
    priority: goal.priority ?? 50,
  };
  goals.set(g.id, g);
  pruneMap(goals, GOALS_CAP);
  return g;
}

export function updateGoal(id: string, patch: Partial<Goal>): Goal | null {
  const g = goals.get(id);
  if (!g) return null;
  Object.assign(g, patch);
  return g;
}

export function listGoals(): Goal[] {
  return [...goals.values()].sort((a, b) => b.priority - a.priority);
}

export function flagContradiction(
  claimA: string,
  claimB: string,
  severity: Contradiction["severity"] = "medium",
): Contradiction {
  const id = `contra-${Buffer.from(claimA + "|" + claimB).toString("base64").slice(0, 12)}`;
  const existing = contradictions.get(id);
  if (existing) return existing;
  const c: Contradiction = { id, at: Date.now(), claimA, claimB, severity, resolved: false };
  contradictions.set(id, c);
  pruneMap(contradictions, CONTRADICTIONS_CAP);
  logger.info({ id, claimA: claimA.slice(0, 80), claimB: claimB.slice(0, 80), severity }, "WorkingMemory: contradiction flagged");
  return c;
}

export function resolveContradiction(id: string, resolution: string): boolean {
  const c = contradictions.get(id);
  if (!c) return false;
  c.resolved = true;
  c.resolution = resolution;
  return true;
}

export function snapshotWorkingMemory() {
  return {
    observations: observations.length,
    observationCap: obsCap(),
    activeObservations: recentObservations(10),
    hypotheses: [...hypotheses.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 20),
    goals: listGoals().slice(0, 20),
    contradictions: [...contradictions.values()].filter((c) => !c.resolved).slice(0, 20),
    stats: {
      totalHypotheses: hypotheses.size,
      totalGoals: goals.size,
      activeGoals: [...goals.values()].filter((g) => g.status === "active").length,
      openContradictions: [...contradictions.values()].filter((c) => !c.resolved).length,
    },
  };
}
