import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import * as fs from "fs/promises";
import * as path from "path";
import {
  generateFreshProposals,
  snapshotDiagnosticsForProgram,
  type RickProposal,
  type ProposalRisk,
} from "./rick-proposals";

export interface DispatchedTask {
  id: string;
  programId: string;
  cycleNumber: number;
  proposalId: string;
  title: string;
  body: string;
  category: string;
  risk: ProposalRisk;
  effortHours: number;
  status: "queued" | "in-progress" | "completed" | "failed" | "cancelled";
  createdAt: number;
  updatedAt: number;
  statusNote?: string;
  filePath?: string;
}

export type CycleStage = "propose" | "review" | "implement" | "reflect" | "done";

export interface MetricSnapshot {
  capturedAt: number;
  overallScorePct: number;
  truthGroundingRate: number;
  truthAvgScore: number;
  meeseeksSuccessRate: number;
  weakCategories: { category: string; score: number }[];
  weakAgi: { category: string; score: number }[];
}

export interface ProgramProposal {
  id: string;
  title: string;
  problem: string;
  evidence: { metric: string; value: string }[];
  proposedChange: string;
  expectedImpact: string;
  risk: ProposalRisk;
  effortHours: number;
  category: string;
  source: "llm" | "deterministic";
  truthfulnessScore?: number;
  decision: "pending" | "approved" | "rejected";
  decidedAt?: number;
  reviewerReason?: string;
  dispatch?: {
    taskRef: string;
    dispatchedAt: number;
    filePath?: string;
    status: "dispatched" | "completed" | "failed";
    statusNote?: string;
  };
  reflection?: {
    text: string;
    metricDelta?: { metric: string; before: number; after: number; delta: number }[];
    reflectedAt: number;
  };
}

export interface ProgramCycle {
  cycleNumber: number;
  stage: CycleStage;
  startedAt: number;
  startSnapshot?: MetricSnapshot;
  endSnapshot?: MetricSnapshot;
  proposals: ProgramProposal[];
  reflectionSummary?: string;
  advancedAt: Partial<Record<CycleStage, number>>;
}

export interface ImprovementProgram {
  id: string;
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  completedAt?: number;
  currentCycle: number;
  cycles: ProgramCycle[];
  finalSummary?: {
    totalProposals: number;
    approvedCount: number;
    rejectedCount: number;
    dispatchedCount: number;
    approvalRate: number;
    strongestImprovement?: { cycle: number; title: string; reflection: string };
    weakestImprovement?: { cycle: number; title: string; reflection: string };
    overallScoreStart: number;
    overallScoreEnd: number;
    overallScoreDelta: number;
    groundingRateStart: number;
    groundingRateEnd: number;
    groundingRateDelta: number;
    meeseeksSuccessStart: number;
    meeseeksSuccessEnd: number;
    meeseeksSuccessDelta: number;
    categoryMovements: { category: string; before: number; after: number; delta: number }[];
    perCycle: {
      cycle: number;
      overallScoreStart: number | null;
      overallScoreEnd: number | null;
      overallScoreDelta: number | null;
      groundingRateDelta: number | null;
      meeseeksSuccessDelta: number | null;
      approvedCount: number;
      dispatchedCount: number;
    }[];
  };
}

interface ProgramStore {
  active: ImprovementProgram | null;
  history: ImprovementProgram[];
  taskQueue?: DispatchedTask[];
}

const STATE_KEY = "rick.improvement-program.v1";
const MAX_CYCLES = 5;
const STAGE_ORDER: CycleStage[] = ["propose", "review", "implement", "reflect", "done"];

let store: ProgramStore = { active: null, history: [] };
let loaded = false;

async function loadStore(): Promise<void> {
  if (loaded) return;
  try {
    const [row] = await db
      .select()
      .from(systemStateTable)
      .where(eq(systemStateTable.key, STATE_KEY))
      .limit(1);
    if (row?.value) {
      const saved = row.value as ProgramStore;
      store.active = saved.active ?? null;
      store.history = Array.isArray(saved.history) ? saved.history.slice(0, 20) : [];
      store.taskQueue = Array.isArray(saved.taskQueue) ? saved.taskQueue.slice(0, 200) : [];
    }
  } catch (err) {
    logger.warn({ err }, "RickProgram: load failed");
  }
  loaded = true;
}

async function persistStore(): Promise<void> {
  await db
    .insert(systemStateTable)
    .values({
      key: STATE_KEY,
      value: store as unknown,
      description: "Rick's 5-cycle improvement program (user-gated)",
    })
    .onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: store as unknown, lastSavedAt: new Date() },
    });
}

function captureSnapshot(): MetricSnapshot {
  const diag = snapshotDiagnosticsForProgram();
  return {
    capturedAt: Date.now(),
    overallScorePct: diag.overallScorePct,
    truthGroundingRate: diag.truthGroundingRate,
    truthAvgScore: diag.truthAvgScore,
    meeseeksSuccessRate: diag.meeseeksSuccessRate,
    weakCategories: diag.weakCategories,
    weakAgi: diag.weakAgi,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toProgramProposal(p: RickProposal): ProgramProposal {
  return {
    id: p.id,
    title: p.title,
    problem: p.problem,
    evidence: p.evidence,
    proposedChange: p.proposedChange,
    expectedImpact: p.expectedImpact,
    risk: p.risk,
    effortHours: p.effortHours,
    category: p.category,
    source: p.source,
    truthfulnessScore: p.truthfulnessScore,
    decision: "pending",
  };
}

function newCycle(num: number): ProgramCycle {
  return {
    cycleNumber: num,
    stage: "propose",
    startedAt: Date.now(),
    proposals: [],
    advancedAt: { propose: Date.now() },
  };
}

export async function getProgram(): Promise<{ active: ImprovementProgram | null; history: ImprovementProgram[] }> {
  await loadStore();
  return { active: store.active, history: store.history.slice(0, 10) };
}

export async function startProgram(): Promise<ImprovementProgram> {
  await loadStore();
  if (store.active && store.active.status === "active") {
    return store.active;
  }
  const now = Date.now();
  const program: ImprovementProgram = {
    id: uid("prog"),
    status: "active",
    createdAt: now,
    currentCycle: 1,
    cycles: [newCycle(1)],
  };
  program.cycles[0].startSnapshot = captureSnapshot();
  store.active = program;
  await persistStore();
  return program;
}

export async function abandonProgram(): Promise<ImprovementProgram | null> {
  await loadStore();
  if (!store.active) return null;
  const p = store.active;
  p.status = "abandoned";
  p.completedAt = Date.now();
  store.history = [p, ...store.history].slice(0, 20);
  store.active = null;
  await persistStore();
  return p;
}

function currentCycle(p: ImprovementProgram): ProgramCycle {
  return p.cycles[p.cycles.length - 1];
}

async function ensureProposeProposals(cycle: ProgramCycle, priorReflection?: string): Promise<void> {
  if (cycle.proposals.length > 0) return;
  const fresh = await generateFreshProposals(5, priorReflection);
  cycle.proposals = fresh.map(toProgramProposal);
}

export async function generateCycleProposals(): Promise<ImprovementProgram> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  if (cycle.stage !== "propose") throw new Error("Proposals can only be generated during the propose stage");
  const prior = p.cycles[p.cycles.length - 2];
  await ensureProposeProposals(cycle, prior?.reflectionSummary);
  await persistStore();
  return p;
}

export async function advanceStage(): Promise<ImprovementProgram> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  const curIdx = STAGE_ORDER.indexOf(cycle.stage);
  if (curIdx < 0) throw new Error(`Unknown stage: ${cycle.stage}`);

  if (cycle.stage === "propose") {
    const prior = p.cycles[p.cycles.length - 2];
    await ensureProposeProposals(cycle, prior?.reflectionSummary);
  } else if (cycle.stage === "review") {
    const pending = cycle.proposals.filter(pr => pr.decision === "pending");
    if (pending.length > 0) {
      throw new Error(`Cannot advance: ${pending.length} proposal(s) still need approve/reject decisions`);
    }
  } else if (cycle.stage === "implement") {
    // Capture end snapshot at implement → reflect transition so Rick's reflections see post-implement metrics.
    cycle.endSnapshot = captureSnapshot();
    autoGenerateReflections(cycle);
  } else if (cycle.stage === "reflect") {
    if (!cycle.endSnapshot) cycle.endSnapshot = captureSnapshot();
    cycle.reflectionSummary = buildReflectionSummary(cycle);
  }

  const nextStage = STAGE_ORDER[curIdx + 1];
  cycle.stage = nextStage;
  cycle.advancedAt[nextStage] = Date.now();

  if (nextStage === "done") {
    if (cycle.cycleNumber >= MAX_CYCLES) {
      p.status = "completed";
      p.completedAt = Date.now();
      p.finalSummary = buildFinalSummary(p);
      store.history = [p, ...store.history].slice(0, 20);
      store.active = null;
    } else {
      const next = newCycle(cycle.cycleNumber + 1);
      next.startSnapshot = captureSnapshot();
      p.currentCycle = next.cycleNumber;
      p.cycles.push(next);
    }
  }

  await persistStore();
  return store.active ?? p;
}

export async function decideProposal(
  proposalId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<ImprovementProgram> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  if (cycle.stage !== "review") throw new Error("Proposals can only be decided during the review stage");
  const proposal = cycle.proposals.find(pr => pr.id === proposalId);
  if (!proposal) throw new Error("Proposal not found in current cycle");
  proposal.decision = decision;
  proposal.decidedAt = Date.now();
  if (reason && reason.trim().length > 0) {
    proposal.reviewerReason = reason.trim().slice(0, 400);
  }
  await persistStore();
  return p;
}

function formatDispatchBody(p: ImprovementProgram, cycle: ProgramCycle, proposal: ProgramProposal): string {
  const evidenceLines = proposal.evidence.map(e => `- ${e.metric}: ${e.value}`).join("\n");
  return `# ${proposal.title}

**Program:** ${p.id} (Cycle ${cycle.cycleNumber} of ${MAX_CYCLES})
**Proposal ID:** ${proposal.id}
**Category:** ${proposal.category}
**Risk:** ${proposal.risk}  ·  **Effort:** ~${proposal.effortHours}h
**Source:** ${proposal.source}${proposal.truthfulnessScore != null ? `  ·  **Truth score:** ${(proposal.truthfulnessScore * 100).toFixed(0)}%` : ""}

## Problem
${proposal.problem}

## Proposed change
${proposal.proposedChange}

## Expected impact
${proposal.expectedImpact}

## Evidence
${evidenceLines}

---
Dispatched from Rick's 5-cycle improvement program.
`;
}

export async function dispatchProposal(proposalId: string): Promise<{ program: ImprovementProgram; task: DispatchedTask }> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  if (cycle.stage !== "implement") throw new Error("Dispatch is only available during the implement stage");
  const proposal = cycle.proposals.find(pr => pr.id === proposalId);
  if (!proposal) throw new Error("Proposal not found in current cycle");
  if (proposal.decision !== "approved") throw new Error("Only approved proposals can be dispatched");

  if (!store.taskQueue) store.taskQueue = [];
  if (proposal.dispatch) {
    const existing = store.taskQueue.find(t => t.id === proposal.dispatch!.taskRef);
    if (existing) return { program: p, task: existing };
  }

  const taskId = uid("task");
  const body = formatDispatchBody(p, cycle, proposal);
  let filePath: string | undefined;
  try {
    const dir = path.resolve(process.cwd(), "..", "..", ".local", "dispatched-tasks");
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${p.id}-c${cycle.cycleNumber}-${taskId}.md`;
    const fullPath = path.join(dir, fileName);
    await fs.writeFile(fullPath, body, "utf-8");
    filePath = fullPath;
  } catch (err) {
    logger.warn({ err }, "RickProgram: failed to persist dispatch file (continuing)");
  }

  const now = Date.now();
  const task: DispatchedTask = {
    id: taskId,
    programId: p.id,
    cycleNumber: cycle.cycleNumber,
    proposalId: proposal.id,
    title: proposal.title,
    body,
    category: proposal.category,
    risk: proposal.risk,
    effortHours: proposal.effortHours,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    statusNote: "Queued for project-task executor. No auto-execution by design.",
    filePath,
  };
  store.taskQueue.unshift(task);
  store.taskQueue = store.taskQueue.slice(0, 200);

  proposal.dispatch = {
    taskRef: taskId,
    dispatchedAt: now,
    filePath,
    status: "dispatched",
    statusNote: task.statusNote,
  };
  await persistStore();
  return { program: p, task };
}

export async function listDispatchedTasks(): Promise<DispatchedTask[]> {
  await loadStore();
  return (store.taskQueue ?? []).slice();
}

export async function getDispatchedTask(id: string): Promise<DispatchedTask | null> {
  await loadStore();
  return (store.taskQueue ?? []).find(t => t.id === id) ?? null;
}

type TaskQueueStatus = DispatchedTask["status"];
const VALID_TASK_STATUS: TaskQueueStatus[] = ["queued", "in-progress", "completed", "failed", "cancelled"];

export async function updateDispatchStatus(
  proposalIdOrTaskId: string,
  status: string,
  note?: string,
): Promise<ImprovementProgram | null> {
  await loadStore();
  if (!VALID_TASK_STATUS.includes(status as TaskQueueStatus)) {
    throw new Error(`status must be one of: ${VALID_TASK_STATUS.join(", ")}`);
  }
  const typed = status as TaskQueueStatus;
  const dispatchUiStatus: "dispatched" | "completed" | "failed" =
    typed === "completed" ? "completed" : typed === "failed" || typed === "cancelled" ? "failed" : "dispatched";
  if (!store.taskQueue) store.taskQueue = [];

  // Resolve to a queue entry first — the queue is the source of truth, independent of active program.
  let task = store.taskQueue.find(t => t.id === proposalIdOrTaskId);
  if (!task) task = store.taskQueue.find(t => t.proposalId === proposalIdOrTaskId);

  // Also mirror into proposal.dispatch across every cycle (active + history) so summary/UI stay consistent.
  const allPrograms: ImprovementProgram[] = [];
  if (store.active) allPrograms.push(store.active);
  allPrograms.push(...store.history);

  let mirroredAny = false;
  for (const program of allPrograms) {
    for (const cyc of program.cycles) {
      for (const pr of cyc.proposals) {
        const matchesById = pr.id === proposalIdOrTaskId;
        const matchesByTaskRef = pr.dispatch && pr.dispatch.taskRef === proposalIdOrTaskId;
        const matchesQueueLink = task && pr.id === task.proposalId;
        if (pr.dispatch && (matchesById || matchesByTaskRef || matchesQueueLink)) {
          pr.dispatch.status = dispatchUiStatus;
          if (note) pr.dispatch.statusNote = note.slice(0, 400);
          mirroredAny = true;
          // If we found the proposal via id and task is still missing, resolve the queue entry now.
          if (!task && pr.dispatch.taskRef) {
            task = store.taskQueue.find(t => t.id === pr.dispatch!.taskRef);
          }
        }
      }
    }
  }

  if (!task && !mirroredAny) {
    throw new Error("No dispatched task found for that id");
  }

  if (task) {
    task.status = typed;
    task.updatedAt = Date.now();
    if (note) task.statusNote = note.slice(0, 400);
  }

  await persistStore();
  return store.active;
}

function computeProposalDelta(cycle: ProgramCycle): { metric: string; before: number; after: number; delta: number }[] {
  if (!cycle.startSnapshot || !cycle.endSnapshot) return [];
  const s = cycle.startSnapshot;
  const e = cycle.endSnapshot;
  const out = [
    { metric: "daemon.overallSystemScorePct", before: s.overallScorePct, after: e.overallScorePct, delta: round(e.overallScorePct - s.overallScorePct) },
    { metric: "truth.groundingRate", before: round(s.truthGroundingRate), after: round(e.truthGroundingRate), delta: round(e.truthGroundingRate - s.truthGroundingRate) },
    { metric: "meeseeks.successRate", before: round(s.meeseeksSuccessRate), after: round(e.meeseeksSuccessRate), delta: round(e.meeseeksSuccessRate - s.meeseeksSuccessRate) },
  ];
  return out;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function recordReflection(proposalId: string, text: string): Promise<ImprovementProgram> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  if (cycle.stage !== "reflect") throw new Error("Reflections can only be edited during the reflect stage");
  const proposal = cycle.proposals.find(pr => pr.id === proposalId);
  if (!proposal) throw new Error("Proposal not found in current cycle");
  if (proposal.decision !== "approved") throw new Error("Only approved proposals receive reflections");
  if (!cycle.endSnapshot) cycle.endSnapshot = captureSnapshot();
  proposal.reflection = {
    text: text.slice(0, 1200),
    metricDelta: proposal.reflection?.metricDelta ?? computeProposalDelta(cycle),
    reflectedAt: Date.now(),
  };
  await persistStore();
  return p;
}

export async function regenerateReflections(): Promise<ImprovementProgram> {
  await loadStore();
  if (!store.active) throw new Error("No active program");
  const p = store.active;
  const cycle = currentCycle(p);
  if (cycle.stage !== "reflect") throw new Error("Reflections can only be regenerated during the reflect stage");
  if (!cycle.endSnapshot) cycle.endSnapshot = captureSnapshot();
  // Overwrite even user-edited reflections: this is an explicit "have Rick redo it" action.
  for (const pr of cycle.proposals) {
    if (pr.decision === "approved") pr.reflection = undefined;
  }
  autoGenerateReflections(cycle);
  await persistStore();
  return p;
}

function autoGenerateReflections(cycle: ProgramCycle): void {
  if (!cycle.startSnapshot) cycle.startSnapshot = captureSnapshot();
  if (!cycle.endSnapshot) cycle.endSnapshot = captureSnapshot();
  const now = Date.now();
  const overallDelta = round(cycle.endSnapshot.overallScorePct - cycle.startSnapshot.overallScorePct);
  const groundingDelta = round(cycle.endSnapshot.truthGroundingRate - cycle.startSnapshot.truthGroundingRate);
  const meeseeksDelta = round(cycle.endSnapshot.meeseeksSuccessRate - cycle.startSnapshot.meeseeksSuccessRate);

  for (const p of cycle.proposals) {
    if (p.decision !== "approved") continue;
    if (p.reflection) continue; // don't overwrite existing
    const categoryBefore = cycle.startSnapshot.weakCategories.find(c => c.category === p.category)?.score;
    const categoryAfter = cycle.endSnapshot.weakCategories.find(c => c.category === p.category)?.score;
    const categoryDelta =
      categoryBefore != null && categoryAfter != null ? round(categoryAfter - categoryBefore) : null;

    const metricDelta = computeProposalDelta(cycle);
    if (categoryBefore != null && categoryAfter != null) {
      metricDelta.push({
        metric: `daemon.${p.category}.score`,
        before: categoryBefore,
        after: categoryAfter,
        delta: round(categoryAfter - categoryBefore),
      });
    }

    const dispatched = p.dispatch ? true : false;
    const verdict = assessVerdict(categoryDelta, overallDelta, dispatched);
    const text = composeReflectionText({
      proposal: p,
      verdict,
      categoryDelta,
      overallDelta,
      groundingDelta,
      meeseeksDelta,
      dispatched,
      statusNote: p.dispatch?.statusNote,
    });

    p.reflection = {
      text,
      metricDelta,
      reflectedAt: now,
    };
  }
}

function assessVerdict(
  categoryDelta: number | null,
  overallDelta: number,
  dispatched: boolean,
): "improved" | "flat" | "regressed" | "not-dispatched" {
  if (!dispatched) return "not-dispatched";
  const primary = categoryDelta ?? overallDelta;
  if (primary > 1) return "improved";
  if (primary < -1) return "regressed";
  return "flat";
}

function composeReflectionText(args: {
  proposal: ProgramProposal;
  verdict: "improved" | "flat" | "regressed" | "not-dispatched";
  categoryDelta: number | null;
  overallDelta: number;
  groundingDelta: number;
  meeseeksDelta: number;
  dispatched: boolean;
  statusNote?: string;
}): string {
  const { proposal, verdict, categoryDelta, overallDelta, groundingDelta, meeseeksDelta, dispatched, statusNote } = args;
  const catStr = categoryDelta == null ? "no tracked score movement" : `${proposal.category} moved ${signed(categoryDelta)}`;
  const overall = `overall score ${signed(overallDelta)}`;
  const grounding = `grounding ${signed(groundingDelta)}`;
  const mks = `meeseeks ${signed(meeseeksDelta)}`;

  switch (verdict) {
    case "improved":
      return `*burp* — it worked. ${catStr}, ${overall}, ${grounding}, ${mks}. Expected: ${proposal.expectedImpact.slice(0, 140)} — close enough. Feed this pattern into the next cycle: more of this, fewer cosmetic patches.`;
    case "regressed":
      return `Metrics went backwards. ${catStr}, ${overall}. Possible causes: the change was implemented wrong, the category is dominated by a variable I didn't model, or it's measurement noise from the short cycle. Next cycle should either roll this back or double-down with a sharper intervention on the root cause.`;
    case "flat":
      return `No real movement. ${catStr}, ${overall}, ${grounding}. Either the change hasn't taken effect yet, the metric is lagging, or the proposal was too shallow. Recommend re-scoping in the next cycle with a narrower, more measurable target.`;
    case "not-dispatched":
      return `Never dispatched as a task${statusNote ? ` (${statusNote.slice(0, 120)})` : ""}. Skipping verdict. Next cycle should re-propose only if the underlying problem is still in the weak list.`;
  }
}

function signed(n: number): string {
  if (n === 0) return "±0";
  return n > 0 ? `+${n}` : String(n);
}

function buildReflectionSummary(cycle: ProgramCycle): string {
  if (!cycle.startSnapshot || !cycle.endSnapshot) return "No metric snapshots captured.";
  const d = round(cycle.endSnapshot.overallScorePct - cycle.startSnapshot.overallScorePct);
  const g = round(cycle.endSnapshot.truthGroundingRate - cycle.startSnapshot.truthGroundingRate);
  const approved = cycle.proposals.filter(p => p.decision === "approved");
  const reflections = approved
    .filter(p => p.reflection)
    .map(p => `• ${p.title}: ${p.reflection!.text.slice(0, 120)}`)
    .join("\n");
  return `Cycle ${cycle.cycleNumber}: daemon score ${cycle.startSnapshot.overallScorePct} → ${cycle.endSnapshot.overallScorePct} (Δ ${d >= 0 ? "+" : ""}${d}); grounding rate Δ ${g >= 0 ? "+" : ""}${g}. ${approved.length} approved proposal(s).${reflections ? "\n" + reflections : ""}`;
}

function buildFinalSummary(p: ImprovementProgram): ImprovementProgram["finalSummary"] {
  const all = p.cycles.flatMap(c => c.proposals);
  const approved = all.filter(x => x.decision === "approved");
  const rejected = all.filter(x => x.decision === "rejected");
  const dispatched = approved.filter(x => x.dispatch).length;
  const approvalRate = all.length > 0 ? approved.length / all.length : 0;

  const reflected = p.cycles.flatMap(c =>
    c.proposals
      .filter(pr => pr.reflection && pr.reflection.metricDelta && pr.reflection.metricDelta.length > 0)
      .map(pr => ({
        cycle: c.cycleNumber,
        title: pr.title,
        reflection: pr.reflection!.text,
        primaryDelta: pr.reflection!.metricDelta![0]?.delta ?? 0,
      })),
  );
  reflected.sort((a, b) => b.primaryDelta - a.primaryDelta);
  const strongest = reflected[0];
  const weakest = reflected[reflected.length - 1];

  const firstCycle = p.cycles[0];
  const lastCycle = p.cycles[p.cycles.length - 1];
  const firstSnap = firstCycle?.startSnapshot;
  const lastSnap = lastCycle?.endSnapshot ?? lastCycle?.startSnapshot;

  const overallScoreStart = firstSnap?.overallScorePct ?? 0;
  const overallScoreEnd = lastSnap?.overallScorePct ?? overallScoreStart;
  const groundingStart = firstSnap?.truthGroundingRate ?? 0;
  const groundingEnd = lastSnap?.truthGroundingRate ?? groundingStart;
  const meeseeksStart = firstSnap?.meeseeksSuccessRate ?? 0;
  const meeseeksEnd = lastSnap?.meeseeksSuccessRate ?? meeseeksStart;

  // Track weak-category movement across the whole program.
  const categoryMovements: { category: string; before: number; after: number; delta: number }[] = [];
  if (firstSnap && lastSnap) {
    const seen = new Set<string>();
    const combined = [...firstSnap.weakCategories, ...lastSnap.weakCategories];
    for (const entry of combined) {
      if (seen.has(entry.category)) continue;
      seen.add(entry.category);
      const before = firstSnap.weakCategories.find(c => c.category === entry.category)?.score;
      const after = lastSnap.weakCategories.find(c => c.category === entry.category)?.score;
      if (before == null || after == null) continue;
      categoryMovements.push({ category: entry.category, before, after, delta: round(after - before) });
    }
    categoryMovements.sort((a, b) => b.delta - a.delta);
  }

  // Per-cycle metric trajectory.
  const perCycle = p.cycles.map(c => ({
    cycle: c.cycleNumber,
    overallScoreStart: c.startSnapshot?.overallScorePct ?? null,
    overallScoreEnd: c.endSnapshot?.overallScorePct ?? null,
    overallScoreDelta:
      c.startSnapshot && c.endSnapshot
        ? round(c.endSnapshot.overallScorePct - c.startSnapshot.overallScorePct)
        : null,
    groundingRateDelta:
      c.startSnapshot && c.endSnapshot
        ? round(c.endSnapshot.truthGroundingRate - c.startSnapshot.truthGroundingRate)
        : null,
    meeseeksSuccessDelta:
      c.startSnapshot && c.endSnapshot
        ? round(c.endSnapshot.meeseeksSuccessRate - c.startSnapshot.meeseeksSuccessRate)
        : null,
    approvedCount: c.proposals.filter(pr => pr.decision === "approved").length,
    dispatchedCount: c.proposals.filter(pr => pr.dispatch).length,
  }));

  return {
    totalProposals: all.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    dispatchedCount: dispatched,
    approvalRate: round(approvalRate),
    strongestImprovement: strongest ? { cycle: strongest.cycle, title: strongest.title, reflection: strongest.reflection } : undefined,
    weakestImprovement: weakest && weakest !== strongest ? { cycle: weakest.cycle, title: weakest.title, reflection: weakest.reflection } : undefined,
    overallScoreStart,
    overallScoreEnd,
    overallScoreDelta: round(overallScoreEnd - overallScoreStart),
    groundingRateStart: round(groundingStart),
    groundingRateEnd: round(groundingEnd),
    groundingRateDelta: round(groundingEnd - groundingStart),
    meeseeksSuccessStart: round(meeseeksStart),
    meeseeksSuccessEnd: round(meeseeksEnd),
    meeseeksSuccessDelta: round(meeseeksEnd - meeseeksStart),
    categoryMovements,
    perCycle,
  };
}

export const PROGRAM_MAX_CYCLES = MAX_CYCLES;
export const PROGRAM_STAGES: CycleStage[] = STAGE_ORDER;
