import { Router, type Request, type Response } from "express";
import { createProposal, getAllProposals, getProposal, getConsensusMetrics, GRAND_COUNCIL_AGENTS, drainRetryQueue } from "../lib/consensus-engine";
import { getExecutorMetrics, getSystemConfig, updateSystemConfig } from "../lib/council-executor";
import { validateMeshToken } from "../lib/mesh-auth";

const router = Router();

router.get("/consensus/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getConsensusMetrics() });
});

router.get("/consensus/proposals", (_req: Request, res: Response) => {
  const proposals = getAllProposals();
  res.json({ ok: true, data: proposals, count: proposals.length });
});

router.get("/consensus/proposals/:id", (req: Request, res: Response) => {
  const proposal = getProposal(String(req.params.id));
  if (!proposal) { res.status(404).json({ ok: false, error: "Proposal not found" }); return; }
  res.json({ ok: true, data: proposal });
});

router.post("/consensus/propose", async (req: Request, res: Response) => {
  const { title, description, proposedBy = "Tessera", category = "feature" } = req.body;
  if (!title || !description) {
    res.status(400).json({ ok: false, error: "title and description are required" });
    return;
  }
  const proposal = await createProposal({ title, description, proposedBy, category });
  res.json({ ok: true, data: proposal });
});

router.get("/consensus/agents", (_req: Request, res: Response) => {
  res.json({ ok: true, data: GRAND_COUNCIL_AGENTS, count: GRAND_COUNCIL_AGENTS.length });
});

router.get("/council-executor/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getExecutorMetrics() });
});

router.get("/council-executor/config", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getSystemConfig() });
});

router.patch("/council-executor/config", (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    res.status(400).json({ ok: false, error: "key and value are required" });
    return;
  }
  updateSystemConfig(key, value);
  res.json({ ok: true, message: `Config updated: ${key} = ${JSON.stringify(value)}` });
});

router.post("/consensus/drain-queue", async (req: Request, res: Response) => {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!validateMeshToken(token)) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required" });
    return;
  }
  const result = await drainRetryQueue(100);
  res.json({ ok: true, data: result });
});

export default router;
