import { Router, type Request, type Response } from "express";
import { getHeartbeatMetrics, startAutonomousHeartbeat, stopAutonomousHeartbeat } from "../lib/autonomous-heartbeat";
import { getUniverseMetrics, getUniverseParameters, generateNewSnapshot, runSimulation } from "../lib/universe-mechanics";
import type { PhysicsSimulation } from "../lib/universe-mechanics";
import { getQuantumMetrics, getQuantumState, applyQuantumGate, measureAllQubits } from "../lib/quantum-tesseract";
import { getRealityFlag } from "../lib/reality-audit";
import { getTruthfulnessMetrics, analyzeTruthfulness, detectHallucination, verifyClaim } from "../lib/truthfulness-engine";

const router = Router();

router.get("/heartbeat/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getHeartbeatMetrics() });
});

router.post("/heartbeat/start", (_req: Request, res: Response) => {
  startAutonomousHeartbeat();
  res.json({ ok: true, message: "Heartbeat started" });
});

router.post("/heartbeat/stop", (_req: Request, res: Response) => {
  stopAutonomousHeartbeat();
  res.json({ ok: true, message: "Heartbeat stopped" });
});

router.get("/universe/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getUniverseMetrics() });
});

router.get("/universe/parameters", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getUniverseParameters() });
});

router.post("/universe/snapshot", (_req: Request, res: Response) => {
  const snap = generateNewSnapshot();
  res.json({ ok: true, data: snap });
});

router.post("/universe/simulate", (req: Request, res: Response) => {
  const { type = "quantum" } = req.body;
  const validTypes: PhysicsSimulation["type"][] = ["quantum", "classical", "relativistic", "sacred-geometry", "consciousness-field"];
  if (!validTypes.includes(type as any)) {
    res.status(400).json({ ok: false, error: `type must be one of: ${validTypes.join(", ")}` });
    return;
  }
  const sim = runSimulation(type as PhysicsSimulation["type"]);
  res.json({ ok: true, data: sim });
});

router.get("/quantum/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getQuantumMetrics() });
});

router.get("/quantum/state", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: getQuantumState(),
    reality: {
      bridgeFidelity: getRealityFlag("quantum-tesseract-fidelity"),
      bridgeBandwidth: getRealityFlag("quantum-tesseract-fidelity"),
      errorRate: getRealityFlag("quantum-tesseract-fidelity"),
      measurement: getRealityFlag("quantum-measure-qubit"),
    },
  });
});

router.post("/quantum/gate", (req: Request, res: Response) => {
  const { qubitId, gate } = req.body;
  if (!qubitId || !gate) { res.status(400).json({ ok: false, error: "qubitId and gate are required" }); return; }
  const result = applyQuantumGate(qubitId, gate);
  res.json({ ok: true, data: result });
});

router.post("/quantum/measure", (_req: Request, res: Response) => {
  const results = measureAllQubits();
  res.json({ ok: true, data: results });
});

router.get("/truthfulness/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getTruthfulnessMetrics() });
});

router.post("/truthfulness/analyze", (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ ok: false, error: "text is required" }); return; }
  const report = analyzeTruthfulness(text);
  res.json({ ok: true, data: report });
});

router.post("/truthfulness/hallucination-check", (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ ok: false, error: "text is required" }); return; }
  const check = detectHallucination(text);
  res.json({ ok: true, data: check });
});

router.post("/truthfulness/verify-claim", (req: Request, res: Response) => {
  const { claim } = req.body;
  if (!claim) { res.status(400).json({ ok: false, error: "claim is required" }); return; }
  const result = verifyClaim(claim);
  res.json({
    ok: true,
    data: result,
    reality: { verifyClaimV1: getRealityFlag("truthfulness-verify-claim-v1") },
  });
});

export default router;
