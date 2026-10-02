import { Router } from "express";
import { snapshotWorkingMemory, recordObservation } from "../lib/agi/working-memory.js";
import { busStats, publish, pullRecent, pullTopK } from "../lib/agi/agent-bus.js";
import { causalModelSnapshot, allEffects, predictedEffects, recommendDirection } from "../lib/agi/causal-model.js";
import { createPlan, listPlans, getPlan, evaluatePlan } from "../lib/agi/goal-planner.js";
import { metacognitionSnapshot, runMetacognitionTick } from "../lib/agi/metacognition.js";
import { db } from "@workspace/db";
import { inventionsTable } from "@workspace/db/schema";
import { getLastSynthesis } from "../lib/invention-synthesis.js";
import { getConsensusMetrics } from "../lib/consensus-engine.js";
import { getAllTunables } from "../lib/system-tunables.js";

const router = Router();

// --- Working Memory ---
router.get("/agi/working-memory", (_req, res) => res.json({ ok: true, ...snapshotWorkingMemory() }));
router.post("/agi/working-memory/observation", (req, res) => {
  const { source, topic, payload } = req.body || {};
  if (!source || !topic) { res.status(400).json({ ok: false, error: "source + topic required" }); return; }
  res.json({ ok: true, observation: recordObservation(source, topic, payload ?? {}) });
});

// --- Agent Bus ---
router.get("/agi/bus/stats", (_req, res) => res.json({ ok: true, ...busStats() }));
router.get("/agi/bus/recent", (req, res) => {
  const limit = Math.min(200, parseInt((req.query.limit as string) || "50", 10));
  res.json({ ok: true, messages: pullRecent(limit, req.query.topic as string | undefined) });
});
router.get("/agi/bus/top", (req, res) => {
  const k = Math.min(100, parseInt((req.query.k as string) || "20", 10));
  res.json({ ok: true, messages: pullTopK(k, req.query.topic as string | undefined) });
});
router.post("/agi/bus/publish", (req, res) => {
  const { from, topic, payload, priority } = req.body || {};
  if (!from || !topic) { res.status(400).json({ ok: false, error: "from + topic required" }); return; }
  res.json({ ok: true, message: publish(from, topic, payload ?? {}, priority) });
});

// --- Causal Model ---
router.get("/agi/causal/snapshot", (_req, res) => res.json({ ok: true, ...causalModelSnapshot() }));
router.get("/agi/causal/effects", (_req, res) => res.json({ ok: true, effects: allEffects() }));
router.get("/agi/causal/predict/:actionKey", (req, res) => res.json({ ok: true, effects: predictedEffects(req.params.actionKey) }));
router.get("/agi/causal/recommend", (req, res) => {
  const { action, metric, target } = req.query as Record<string, string>;
  if (!action || !metric) { res.status(400).json({ ok: false, error: "action + metric required" }); return; }
  res.json({ ok: true, recommendation: recommendDirection(action, metric, (target as "up" | "down") ?? "up") });
});

// --- Goal Planner ---
async function gatherPlannerState() {
  const [all, consensus] = await Promise.all([
    db.select().from(inventionsTable),
    Promise.resolve(getConsensusMetrics()),
  ]);
  const wm = snapshotWorkingMemory();
  const lastSyn = getLastSynthesis();
  const tunables = getAllTunables();
  return {
    builtInventionCount: all.filter((i) => i.status === "built" || i.status === "tested").length,
    approvedProposalCount: consensus.approved,
    openContradictions: wm.stats.openContradictions,
    lastSynthesisAt: lastSyn?.at ?? null,
    tunableDriftCount: tunables.filter((t) => Math.abs(t.value - t.default) / Math.max(1, t.default) > 0.1).length,
  };
}

router.post("/agi/plan", (req, res) => {
  const { goal } = req.body || {};
  if (!goal) { res.status(400).json({ ok: false, error: "goal required" }); return; }
  const plan = createPlan(String(goal));
  res.json({ ok: true, plan });
});
router.get("/agi/plans", (_req, res) => res.json({ ok: true, plans: listPlans() }));
router.get("/agi/plan/:id", async (req, res) => {
  const p = getPlan(req.params.id);
  if (!p) { res.status(404).json({ ok: false, error: "plan not found" }); return; }
  const state = await gatherPlannerState();
  const evaluation = evaluatePlan(p, state);
  res.json({ ok: true, plan: p, state, evaluation });
});

// --- Metacognition ---
router.get("/agi/metacognition", (_req, res) => res.json({ ok: true, ...metacognitionSnapshot() }));
router.post("/agi/metacognition/tick", async (_req, res) => {
  const state = await gatherPlannerState();
  const metrics = {
    builtInventions: state.builtInventionCount,
    approvedProposals: state.approvedProposalCount,
    openContradictions: state.openContradictions,
    tunableDriftCount: state.tunableDriftCount,
  };
  const findings = runMetacognitionTick(metrics);
  res.json({ ok: true, findings });
});

// --- Unified snapshot ---
router.get("/agi/snapshot", async (_req, res) => {
  const state = await gatherPlannerState();
  res.json({
    ok: true,
    workingMemory: snapshotWorkingMemory().stats,
    bus: busStats(),
    causal: { effects: allEffects().slice(0, 10), open: causalModelSnapshot().openEvents },
    plans: listPlans().length,
    metacognition: {
      recent: metacognitionSnapshot().recentFindings.slice(0, 5),
      bySeverity: metacognitionSnapshot().bySeverity,
    },
    plannerState: state,
  });
});

export default router;
