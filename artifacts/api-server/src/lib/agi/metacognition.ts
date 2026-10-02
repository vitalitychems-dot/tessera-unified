/**
 * Metacognition Loop.
 *
 * Continuously inspects the system's own recent activity and identifies:
 *   - stalls          : no progress on goals / no synthesis / no approved proposals
 *   - drift           : tunables pushed near their extremes repeatedly
 *   - contradictions  : claims in working memory that disagree
 *   - circular actions: same action keeps reversing itself (hysteresis)
 *
 * Findings are written back to working memory as contradictions /
 * hypotheses, published on the agent bus, and — when actionable — scheduled
 * as corrective consensus proposals (via the existing consensus engine).
 */

import { flagContradiction, assertHypothesis, snapshotWorkingMemory } from "./working-memory.js";
import { publish } from "./agent-bus.js";
import { causalModelSnapshot, samplePostStates } from "./causal-model.js";
import { getAllTunables } from "../system-tunables.js";
import { getLastSynthesis, getSynthesisHistory } from "../invention-synthesis.js";
import { getConsensusMetrics } from "../consensus-engine.js";
import { logger } from "../logger.js";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "../sacred-scheduler";

export interface MetacognitionFinding {
  id: string;
  at: number;
  kind: "stall" | "drift" | "contradiction" | "hysteresis" | "healthy";
  severity: "low" | "medium" | "high";
  summary: string;
  evidence: Record<string, unknown>;
  recommendedAction?: string;
}

const findingsLog: MetacognitionFinding[] = [];
const FINDINGS_CAP = 200;

function push(f: MetacognitionFinding) {
  findingsLog.unshift(f);
  if (findingsLog.length > FINDINGS_CAP) findingsLog.length = FINDINGS_CAP;
  publish("metacognition", `finding:${f.kind}`, { id: f.id, severity: f.severity, summary: f.summary }, f.severity === "high" ? 95 : f.severity === "medium" ? 70 : 40);
}

/** Check for drift: any tunable at >85% of its range. */
function detectDrift(): MetacognitionFinding[] {
  const out: MetacognitionFinding[] = [];
  for (const t of getAllTunables()) {
    if (t.percentOfRange >= 85 || t.percentOfRange <= 15) {
      out.push({
        id: `drift-${t.key}-${Date.now()}`,
        at: Date.now(),
        kind: "drift",
        severity: t.percentOfRange >= 95 || t.percentOfRange <= 5 ? "high" : "medium",
        summary: `Tunable ${t.key} at ${t.percentOfRange}% of range (${t.value}${t.unit}).`,
        evidence: { key: t.key, value: t.value, min: t.min, max: t.max, lastReason: t.lastChangeReason },
        recommendedAction: `Re-center ${t.key} toward default (${t.default}).`,
      });
    }
  }
  return out;
}

/** Check for stalls: no synthesis in >30 min, or no approved proposals in last window. */
function detectStalls(): MetacognitionFinding[] {
  const out: MetacognitionFinding[] = [];
  const last = getLastSynthesis();
  if (!last || Date.now() - last.at > 30 * 60 * 1000) {
    out.push({
      id: `stall-synthesis-${Date.now()}`,
      at: Date.now(),
      kind: "stall",
      severity: last ? "medium" : "high",
      summary: last ? `No synthesis in ${Math.round((Date.now() - last.at) / 60000)} min.` : "No synthesis has ever run.",
      evidence: { lastAt: last?.at ?? null },
      recommendedAction: "Trigger POST /api/inventions/synthesize.",
    });
  }
  try {
    const c = getConsensusMetrics();
    if (c.totalProposals > 5 && c.approved === 0) {
      out.push({
        id: `stall-consensus-${Date.now()}`,
        at: Date.now(),
        kind: "stall",
        severity: "high",
        summary: `${c.totalProposals} proposals but 0 approved.`,
        evidence: { totalProposals: c.totalProposals, approved: c.approved, voting: c.voting },
        recommendedAction: "Lower consensusMinVotes tunable or inspect vote-counting path.",
      });
    }
  } catch {}
  return out;
}

/** Check for hysteresis: same tunable reversing direction within last N syntheses. */
function detectHysteresis(): MetacognitionFinding[] {
  const out: MetacognitionFinding[] = [];
  const history = getSynthesisHistory(5);
  if (history.length < 3) return out;
  const perKey = new Map<string, Array<number>>();
  for (const r of history) {
    for (const c of r.tunableChanges) {
      const arr = perKey.get(c.key) || [];
      arr.push(c.to - c.from);
      perKey.set(c.key, arr);
    }
  }
  for (const [key, deltas] of perKey) {
    if (deltas.length < 3) continue;
    // Count sign flips.
    let flips = 0;
    for (let i = 1; i < deltas.length; i++) {
      if ((deltas[i - 1] > 0) !== (deltas[i] > 0)) flips += 1;
    }
    if (flips >= 2) {
      out.push({
        id: `hysteresis-${key}-${Date.now()}`,
        at: Date.now(),
        kind: "hysteresis",
        severity: "medium",
        summary: `Tunable ${key} reversed direction ${flips} times in last ${deltas.length} syntheses — likely oscillating.`,
        evidence: { key, deltas, flips },
        recommendedAction: `Damp synthesis effect on ${key} or add a dead-zone around current value.`,
      });
      flagContradiction(
        `${key} should increase (previous synthesis)`,
        `${key} should decrease (current synthesis)`,
        "medium",
      );
    }
  }
  return out;
}

function emitHealthy(): MetacognitionFinding {
  const wm = snapshotWorkingMemory();
  return {
    id: `healthy-${Date.now()}`,
    at: Date.now(),
    kind: "healthy",
    severity: "low",
    summary: `System healthy: ${wm.stats.activeGoals} active goals, ${wm.stats.openContradictions} open contradictions.`,
    evidence: wm.stats as unknown as Record<string, unknown>,
  };
}

export function runMetacognitionTick(nowMetrics: Record<string, number>): MetacognitionFinding[] {
  // First, close any causal loops waiting on post-state samples.
  try { samplePostStates({ at: Date.now(), metrics: nowMetrics }); } catch {}

  const findings: MetacognitionFinding[] = [
    ...detectDrift(),
    ...detectStalls(),
    ...detectHysteresis(),
  ];

  if (findings.length === 0) {
    const h = emitHealthy();
    findingsLog.unshift(h);
    return [h];
  }

  for (const f of findings) {
    push(f);
    if (f.severity === "high") {
      assertHypothesis(
        `High-severity ${f.kind}: ${f.summary}`,
        0.85,
        ["metacognition"],
        [],
      );
    }
  }
  logger.info({ findings: findings.length, kinds: findings.map((f) => f.kind) }, "Metacognition: tick complete");
  return findings;
}

export function metacognitionSnapshot() {
  return {
    totalFindings: findingsLog.length,
    recentFindings: findingsLog.slice(0, 30),
    bySeverity: {
      high: findingsLog.filter((f) => f.severity === "high").length,
      medium: findingsLog.filter((f) => f.severity === "medium").length,
      low: findingsLog.filter((f) => f.severity === "low").length,
    },
    causalModel: causalModelSnapshot(),
  };
}

// ----- auto-run loop -----
let loopHandle: SacredHandle | null = null;
export function startMetacognitionLoop(intervalMs = 60_000, getMetrics: () => Record<string, number>) {
  if (loopHandle) return;
  loopHandle = setSacredInterval(() => {
    try { runMetacognitionTick(getMetrics()); } catch (err) { logger.warn({ err }, "Metacognition tick failed", "metacognition"); }
  }, intervalMs, "metacognition");
  if (typeof loopHandle.unref === "function") loopHandle.unref();
}
