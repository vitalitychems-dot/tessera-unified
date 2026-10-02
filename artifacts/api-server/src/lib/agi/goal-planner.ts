/**
 * Goal Decomposition Planner.
 *
 * Takes a top-level goal and produces a DAG of subgoals. Each subgoal has a
 * `completionCheck` predicate that reads live system state to decide whether
 * it is complete. The planner periodically re-evaluates the DAG, advances
 * ready subgoals, and re-plans around blocked ones.
 *
 * Decomposition uses a small set of DOMAIN RECIPES — structured templates
 * keyed by goal intent. This is fully deterministic; no LLM in the loop.
 */

import { setGoal, updateGoal, listGoals, recordObservation } from "./working-memory.js";
import { publish } from "./agent-bus.js";

export interface PlanNode {
  id: string;
  parentId?: string;
  goal: string;
  dependsOn: string[];
  priority: number;
  completionCheck: string; // key into CHECK_REGISTRY
  completionArg?: unknown;
}

export interface PlanDAG {
  rootId: string;
  createdAt: number;
  nodes: Record<string, PlanNode>;
  goalText: string;
  intent: string;
}

const plans = new Map<string, PlanDAG>();
const PLANS_CAP = 100;
function prunePlans(): void {
  if (plans.size <= PLANS_CAP) return;
  const sorted = [...plans.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  const toRemove = sorted.slice(0, plans.size - PLANS_CAP);
  for (const [k] of toRemove) plans.delete(k);
}

// ---------- completion predicates ----------
// Each check takes the DAG + node and returns { done: boolean, progress: 0..1 }.
export type CompletionCheck = (node: PlanNode, getState: () => PlannerState) => { done: boolean; progress: number; note?: string };

export interface PlannerState {
  builtInventionCount: number;
  approvedProposalCount: number;
  openContradictions: number;
  lastSynthesisAt: number | null;
  tunableDriftCount: number;
}

const CHECK_REGISTRY: Record<string, CompletionCheck> = {
  builtInventionsAtLeast: (node, getState) => {
    const target = (node.completionArg as number) ?? 10;
    const state = getState();
    const progress = Math.min(1, state.builtInventionCount / target);
    return { done: state.builtInventionCount >= target, progress, note: `${state.builtInventionCount}/${target} built` };
  },
  approvedProposalsAtLeast: (node, getState) => {
    const target = (node.completionArg as number) ?? 3;
    const state = getState();
    const progress = Math.min(1, state.approvedProposalCount / target);
    return { done: state.approvedProposalCount >= target, progress, note: `${state.approvedProposalCount}/${target} approved` };
  },
  noOpenContradictions: (_node, getState) => {
    const state = getState();
    return { done: state.openContradictions === 0, progress: state.openContradictions === 0 ? 1 : 0, note: `${state.openContradictions} open` };
  },
  synthesisFreshness: (node, getState) => {
    const maxAgeMs = (node.completionArg as number) ?? 15 * 60 * 1000;
    const state = getState();
    if (!state.lastSynthesisAt) return { done: false, progress: 0, note: "no synthesis yet" };
    const age = Date.now() - state.lastSynthesisAt;
    const progress = Math.max(0, Math.min(1, 1 - age / maxAgeMs));
    return { done: age <= maxAgeMs, progress, note: `age ${Math.round(age / 1000)}s` };
  },
  tunablesStable: (node, getState) => {
    const max = (node.completionArg as number) ?? 3;
    const state = getState();
    const progress = Math.max(0, 1 - state.tunableDriftCount / Math.max(1, max));
    return { done: state.tunableDriftCount <= max, progress, note: `${state.tunableDriftCount} recently drifted` };
  },
};

// ---------- decomposition recipes ----------
interface Recipe {
  intent: string;
  match: (goal: string) => boolean;
  decompose: (goal: string, rootId: string) => PlanNode[];
}

const RECIPES: Recipe[] = [
  {
    intent: "accelerate-building",
    match: (g) => /build|ship|produce|deliver/i.test(g),
    decompose: (goal, rootId) => [
      { id: `${rootId}-a`, parentId: rootId, goal: "Keep synthesis fresh (<15m)", dependsOn: [], priority: 80, completionCheck: "synthesisFreshness", completionArg: 15 * 60 * 1000 },
      { id: `${rootId}-b`, parentId: rootId, goal: "At least 60 built inventions", dependsOn: [], priority: 70, completionCheck: "builtInventionsAtLeast", completionArg: 60 },
      { id: `${rootId}-c`, parentId: rootId, goal: "Keep tunables within safe drift", dependsOn: [], priority: 60, completionCheck: "tunablesStable", completionArg: 4 },
    ],
  },
  {
    intent: "raise-consensus-throughput",
    match: (g) => /consensus|vote|approve|ratify/i.test(g),
    decompose: (goal, rootId) => [
      { id: `${rootId}-a`, parentId: rootId, goal: "≥ 5 approved proposals", dependsOn: [], priority: 85, completionCheck: "approvedProposalsAtLeast", completionArg: 5 },
      { id: `${rootId}-b`, parentId: rootId, goal: "No open contradictions", dependsOn: [`${rootId}-a`], priority: 75, completionCheck: "noOpenContradictions" },
      { id: `${rootId}-c`, parentId: rootId, goal: "Fresh synthesis (<20m)", dependsOn: [], priority: 60, completionCheck: "synthesisFreshness", completionArg: 20 * 60 * 1000 },
    ],
  },
  {
    intent: "stabilize-system",
    match: () => true, // fallback
    decompose: (goal, rootId) => [
      { id: `${rootId}-a`, parentId: rootId, goal: "Resolve all open contradictions", dependsOn: [], priority: 90, completionCheck: "noOpenContradictions" },
      { id: `${rootId}-b`, parentId: rootId, goal: "Tunables stable (≤3 recent drifts)", dependsOn: [], priority: 70, completionCheck: "tunablesStable", completionArg: 3 },
      { id: `${rootId}-c`, parentId: rootId, goal: "Fresh synthesis (<30m)", dependsOn: [], priority: 50, completionCheck: "synthesisFreshness", completionArg: 30 * 60 * 1000 },
    ],
  },
];

export function createPlan(goalText: string): PlanDAG {
  const rootId = `plan-${Date.now().toString(36)}`;
  const recipe = RECIPES.find((r) => r.match(goalText)) || RECIPES[RECIPES.length - 1];
  const children = recipe.decompose(goalText, rootId);
  const root: PlanNode = {
    id: rootId,
    goal: goalText,
    dependsOn: children.map((c) => c.id),
    priority: 100,
    completionCheck: "always-via-children",
  };
  const nodes: Record<string, PlanNode> = { [rootId]: root };
  for (const c of children) nodes[c.id] = c;

  const dag: PlanDAG = { rootId, createdAt: Date.now(), nodes, goalText, intent: recipe.intent };
  plans.set(rootId, dag);
  prunePlans();

  // Mirror each node into working memory as a goal.
  setGoal({ id: rootId, goal: goalText, priority: 100 });
  for (const c of children) setGoal({ id: c.id, goal: c.goal, priority: c.priority, parentId: rootId });

  publish("goal-planner", "plan-created", { rootId, intent: recipe.intent, subgoals: children.length }, 80);
  return dag;
}

export function evaluatePlan(dag: PlanDAG, state: PlannerState): Record<string, { done: boolean; progress: number; note?: string }> {
  const out: Record<string, { done: boolean; progress: number; note?: string }> = {};
  for (const node of Object.values(dag.nodes)) {
    if (node.id === dag.rootId) continue; // root is derived
    const check = CHECK_REGISTRY[node.completionCheck];
    const r = check ? check(node, () => state) : { done: false, progress: 0 };
    out[node.id] = r;
    updateGoal(node.id, {
      status: r.done ? "complete" : "active",
      progress: r.progress,
    });
  }
  // Roll-up root
  const children = Object.values(dag.nodes).filter((n) => n.parentId === dag.rootId);
  if (children.length) {
    const avg = children.reduce((s, c) => s + (out[c.id]?.progress ?? 0), 0) / children.length;
    const allDone = children.every((c) => out[c.id]?.done);
    updateGoal(dag.rootId, { progress: avg, status: allDone ? "complete" : "active" });
    out[dag.rootId] = { done: allDone, progress: avg };
  }
  return out;
}

export function listPlans(): PlanDAG[] {
  return [...plans.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getPlan(id: string): PlanDAG | undefined {
  return plans.get(id);
}

export function listAllGoalsFromMemory() {
  return listGoals();
}
