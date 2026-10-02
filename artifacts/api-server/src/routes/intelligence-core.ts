import { Router, type Request, type Response } from "express";
import { getCollectiveIntelMetrics, submitCapability, runTrainingCycle } from "../lib/collective-intelligence";
import { getSwarmOptimizerMetrics, getOptimalModel, buildSwarmConsensus, recordPerformance } from "../lib/swarm-optimizer";
import type { OptimizerCategory } from "../lib/swarm-optimizer";

const router = Router();

router.get("/collective-intelligence/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getCollectiveIntelMetrics() });
});

router.post("/collective-intelligence/submit-capability", (req: Request, res: Response) => {
  const { agentId, capability, category, description, examples = [] } = req.body;
  if (!agentId || !capability || !category || !description) {
    res.status(400).json({ ok: false, error: "agentId, capability, category, and description are required" });
    return;
  }
  const cap = submitCapability(agentId, capability, category, description, examples);
  res.json({ ok: true, data: cap });
});

router.post("/collective-intelligence/training-cycle", async (_req: Request, res: Response) => {
  const cycle = await runTrainingCycle();
  res.json({ ok: true, data: cycle });
});

router.get("/swarm-optimizer/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getSwarmOptimizerMetrics() });
});

router.get("/swarm-optimizer/optimal/:category", (req: Request, res: Response) => {
  const { category } = req.params;
  const result = getOptimalModel(category as OptimizerCategory);
  res.json({ ok: true, data: result });
});

router.post("/swarm-optimizer/consensus", (req: Request, res: Response) => {
  const { topic = "System optimization" } = req.body;
  const consensus = buildSwarmConsensus(topic);
  res.json({ ok: true, data: consensus });
});

router.post("/swarm-optimizer/record-performance", (req: Request, res: Response) => {
  const { modelId, category, score } = req.body;
  if (!modelId || !category || score === undefined) {
    res.status(400).json({ ok: false, error: "modelId, category, and score are required" });
    return;
  }
  recordPerformance(modelId, category as OptimizerCategory, score);
  res.json({ ok: true, message: "Performance recorded" });
});

export default router;
