import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { routingDecisionsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  buildLiveRoutingGraph,
  selectOptimalRoute,
  dijkstra,
  invalidateGraphCache,
} from "../lib/routing-graph";

const router: IRouter = Router();

router.get("/routing/graph", async (_req, res) => {
  try {
    const graph = await buildLiveRoutingGraph();

    const nodes = Array.from(graph.nodes.values()).map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      domain: n.domain,
      load: n.load,
      capacity: n.capacity,
      latencyMs: n.latencyMs,
      errorRate: n.errorRate,
      reliabilityScore: n.reliabilityScore,
      capabilityScore: n.capabilityScore,
      isExternal: n.isExternal,
      loadPct: n.capacity > 0 ? Math.round((n.load / n.capacity) * 100) : 0,
    }));

    return res.json({
      ok: true,
      nodes,
      edges: graph.edges,
      nodeCount: nodes.length,
      edgeCount: graph.edges.length,
      algorithm: "Dijkstra shortest-path + load-balanced routing",
      lastUpdated: graph.lastUpdated,
      topology: "hierarchical DAG — coordinator → agent → provider",
    });
  } catch (err) {
    logger.error({ err }, "Failed to build routing graph");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/routing/route", async (req, res) => {
  try {
    const { task, domains } = req.body as { task: string; domains?: string[] };
    if (!task || typeof task !== "string") {
      return res.status(400).json({ ok: false, error: "task is required" });
    }

    const taskDomains = domains && domains.length > 0 ? domains : ["retrieval"];
    const decision = await selectOptimalRoute(task, taskDomains);

    return res.json({
      ok: true,
      task: task.slice(0, 100),
      domains: taskDomains,
      decision,
    });
  } catch (err) {
    logger.error({ err }, "Routing decision failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/routing/shortest-path", async (req, res) => {
  try {
    const { from, to } = req.body as { from: string; to: string };
    if (!from || !to) {
      return res.status(400).json({ ok: false, error: "from and to are required" });
    }

    const graph = await buildLiveRoutingGraph();
    const result = dijkstra(graph, from, to);

    return res.json({
      ok: true,
      from,
      to,
      path: result.path,
      totalWeight: result.totalWeight,
      algorithm: "Dijkstra",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/routing/decisions", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
    const decisions = await db.select().from(routingDecisionsTable)
      .orderBy(desc(routingDecisionsTable.decidedAt))
      .limit(limit);
    return res.json({ ok: true, decisions, count: decisions.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/routing/load-balance", async (_req, res) => {
  try {
    const graph = await buildLiveRoutingGraph();
    const agents = Array.from(graph.nodes.values()).filter(n => n.type === "agent");
    const providers = Array.from(graph.nodes.values()).filter(n => n.type === "provider");

    const agentLoads = agents.map(a => ({
      id: a.id,
      label: a.label,
      domain: a.domain,
      loadPct: a.capacity > 0 ? Math.round((a.load / a.capacity) * 100) : 0,
      status: a.load >= a.capacity * 0.9 ? "overloaded" : a.load >= a.capacity * 0.5 ? "busy" : "available",
    }));

    const providerLoads = providers.map(p => ({
      id: p.id,
      label: p.label,
      loadPct: p.capacity > 0 ? Math.round((p.load / p.capacity) * 100) : 0,
      isExternal: p.isExternal,
      reliabilityScore: p.reliabilityScore,
      latencyMs: p.latencyMs,
      status: p.load >= p.capacity * 0.9 ? "overloaded" : p.load >= p.capacity * 0.5 ? "busy" : "available",
    }));

    const totalCapacity = agents.reduce((s, a) => s + a.capacity, 0);
    const totalLoad = agents.reduce((s, a) => s + a.load, 0);
    const systemLoadPct = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

    return res.json({
      ok: true,
      systemLoadPct,
      agentLoads,
      providerLoads,
      overloadedAgents: agentLoads.filter(a => a.status === "overloaded").length,
      availableAgents: agentLoads.filter(a => a.status === "available").length,
      recommendation: systemLoadPct > 80
        ? "System under high load — consider scaling or queue management"
        : systemLoadPct > 50
        ? "Moderate load — monitor closely"
        : "System operating normally",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/routing/invalidate-cache", (_req, res) => {
  invalidateGraphCache();
  return res.json({ ok: true, message: "Routing graph cache invalidated" });
});

export default router;
