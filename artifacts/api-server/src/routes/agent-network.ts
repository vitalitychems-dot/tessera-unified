import { Router, type Request, type Response } from "express";
import { getSpawnerMetrics, spawnAgent, spawnBatch, retireAgent, getSpawnerState } from "../lib/agent-spawner";
import { getAgentHierarchy, getChildrenOf, getHierarchyMetrics } from "../lib/agent-hierarchy";
import { getAgentCommsMetrics, sendMessage, broadcastMessage, getThreads, getThread, getFeed } from "../lib/agent-comms";

const router = Router();

router.get("/agent-spawner/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getSpawnerMetrics() });
});

router.get("/agent-spawner/state", (_req: Request, res: Response) => {
  const state = getSpawnerState();
  res.json({ ok: true, data: { totalSpawned: state.totalSpawned, activeCount: state.activeSpawned.length, generationCount: state.generationCount, totalPower: state.totalPower, agents: state.activeSpawned, spawnLog: state.spawnLog.slice(0, 20) } });
});

router.post("/agent-spawner/spawn", (req: Request, res: Response) => {
  const { trigger = "manual-spawn", domains = [] } = req.body;
  const agent = spawnAgent(trigger, domains);
  if (!agent) { res.json({ ok: false, message: "Spawn cooldown active — try again shortly" }); return; }
  res.json({ ok: true, data: agent });
});

router.post("/agent-spawner/spawn-batch", (req: Request, res: Response) => {
  const { count = 3, trigger = "manual-batch", domains = [] } = req.body;
  const limitedCount = Math.min(10, Math.max(1, count));
  const agents = spawnBatch(limitedCount, trigger, domains);
  res.json({ ok: true, data: agents, count: agents.length });
});

router.delete("/agent-spawner/retire/:agentId", (req: Request, res: Response) => {
  const agentId = String(req.params.agentId);
  const success = retireAgent(agentId);
  res.json({ ok: success, message: success ? `Agent ${agentId} retired` : `Agent ${agentId} not found` });
});

router.get("/agent-hierarchy/structure", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getAgentHierarchy() });
});

router.get("/agent-hierarchy/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getHierarchyMetrics() });
});

router.get("/agent-hierarchy/children/:parentName", (req: Request, res: Response) => {
  const parentName = String(req.params.parentName);
  const children = getChildrenOf(parentName);
  res.json({ ok: true, data: children, count: children.length });
});

router.get("/agent-comms/metrics", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getAgentCommsMetrics() });
});

router.get("/agent-comms/feed", (req: Request, res: Response) => {
  const limit = parseInt(String((req as any).query?.limit)) || 50;
  res.json({ ok: true, data: getFeed(Math.min(100, limit)) });
});

router.get("/agent-comms/threads", (_req: Request, res: Response) => {
  res.json({ ok: true, data: getThreads() });
});

router.get("/agent-comms/threads/:threadId", (req: Request, res: Response) => {
  const thread = getThread(String(req.params.threadId));
  if (!thread) { res.status(404).json({ ok: false, error: "Thread not found" }); return; }
  res.json({ ok: true, data: thread });
});

router.post("/agent-comms/send", (req: Request, res: Response) => {
  const { from, to, content, type = "directive", priority = "normal" } = req.body;
  if (!from || !to || !content) { res.status(400).json({ ok: false, error: "from, to, and content are required" }); return; }
  const msg = sendMessage(from, to, content, type, priority);
  res.json({ ok: true, data: msg });
});

router.post("/agent-comms/broadcast", (req: Request, res: Response) => {
  const { from = "Tessera", content, priority = "normal" } = req.body;
  if (!content) { res.status(400).json({ ok: false, error: "content is required" }); return; }
  const msgs = broadcastMessage(from, content, priority);
  res.json({ ok: true, data: msgs, count: msgs.length });
});

export default router;
