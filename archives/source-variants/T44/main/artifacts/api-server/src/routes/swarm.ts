import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { swarmTasksTable, swarmReasoningTracesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateMeshToken } from "../lib/mesh-auth";
import { meshBroadcast } from "../lib/mesh-bus";
import { getSpawnerState, getSpawnerMetrics } from "../lib/agent-spawner";
import { getAgentHierarchy, getHierarchyMetrics } from "../lib/agent-hierarchy";
import { getSwarmOptimizerMetrics } from "../lib/swarm-optimizer";
import { getHeartbeatMetrics } from "../lib/autonomous-heartbeat";

const router: IRouter = Router();

router.get("/swarm/agents", (_req, res) => {
  const spawnerState = getSpawnerState();
  const hierarchy = getAgentHierarchy();
  const hierarchyMetrics = getHierarchyMetrics();

  const parentAgents = hierarchy.parentAgents.map((name: string) => ({
    id: name.toLowerCase(),
    name,
    domain: "sovereign",
    status: "active",
    role: "Grand Council Agent",
    tier: "parent",
  }));

  const childAgents = (hierarchy.children || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    domain: c.expertise || c.shift,
    status: c.status,
    role: `Child of ${c.parentAgent}`,
    tier: "child",
    shift: c.shift,
    ethicsScore: c.ethicsScore,
    trainingProgress: c.trainingProgress,
  }));

  const spawnedAgents = spawnerState.activeSpawned.map((a: any) => ({
    id: a.id,
    name: a.name,
    domain: a.domains?.[0] || "general",
    status: "active",
    role: a.role || "Spawned Agent",
    tier: "spawned",
    generation: a.generation,
    power: a.power,
  }));

  res.json({
    ok: true,
    agents: [...parentAgents, ...childAgents, ...spawnedAgents],
    parentCount: parentAgents.length,
    childCount: childAgents.length,
    spawnedCount: spawnedAgents.length,
    totalCount: parentAgents.length + childAgents.length + spawnedAgents.length,
    hierarchyMetrics,
    timestamp: Date.now(),
  });
});

router.get("/swarm/status", (_req, res) => {
  const spawnerMetrics = getSpawnerMetrics();
  const swarmMetrics = getSwarmOptimizerMetrics();
  const heartbeat = getHeartbeatMetrics();
  const hierarchyMetrics = getHierarchyMetrics();

  res.json({
    ok: true,
    system: "Tessera Sovereign Swarm v2.0 — 19 Engines Active",
    agentNetwork: {
      parents: hierarchyMetrics.parentCount,
      children: hierarchyMetrics.childCount,
      totalAgents: hierarchyMetrics.totalAgents,
      spawned: spawnerMetrics.activeCount,
      totalSpawned: spawnerMetrics.totalSpawned,
      generationCount: spawnerMetrics.generationCount,
    },
    swarmOptimizer: {
      modelCount: swarmMetrics.modelCount,
      categoryCount: swarmMetrics.categoryCount,
      consensusBuilt: swarmMetrics.consensusCount,
    },
    heartbeat: {
      totalBeats: heartbeat.totalBeats,
      systemHealth: heartbeat.systemHealthScore,
      uptimeHours: heartbeat.uptimeHours,
    },
    capabilities: ["PLAN", "EXECUTE", "REFLECT", "IMPROVE", "METACOGNITION", "BFT_CONSENSUS", "SELF_EVOLUTION", "TRUTHFULNESS"],
    timestamp: Date.now(),
  });
});

router.get("/swarm/routing-graph", (_req, res) => {
  const hierarchy = getAgentHierarchy();

  const nodes: any[] = [
    { id: "tessera-prime", label: "Tessera Prime", type: "sovereign", load: 0, capacity: 1000 },
  ];

  const edges: any[] = [];

  for (const name of hierarchy.parentAgents) {
    const nodeId = name.toLowerCase();
    nodes.push({
      id: nodeId,
      label: name,
      type: name === "Tessera" ? "supreme" : name === "Aetherion" || name === "Orion" ? "expansion" : "council",
      domain: "sovereign",
      load: 0,
      capacity: 10,
    });
    edges.push({ from: "tessera-prime", to: nodeId, weight: 1, latencyMs: 5 });
  }

  for (const child of hierarchy.children || []) {
    nodes.push({
      id: child.id,
      label: `${child.name} (${child.shift})`,
      type: "child",
      domain: child.shift,
      load: 0,
      capacity: 5,
    });
    edges.push({ from: child.parentAgent.toLowerCase(), to: child.id, weight: 0.8, latencyMs: 2 });
  }

  res.json({
    ok: true,
    nodes,
    edges,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    algorithm: "Sovereign BFT + Hierarchical Routing (3³ Divine Cube)",
    timestamp: Date.now(),
  });
});

router.post("/swarm/classify", (req, res) => {
  try {
    const { task } = req.body as { task: string };
    if (!task || typeof task !== "string") {
      return res.status(400).json({ ok: false, error: "task is required" });
    }

    const lower = task.toLowerCase();
    const domains: string[] = [];

    if (lower.match(/\b(math|calcul|equation|algebra|integral|derivative|probability|statistic|number|formula|proof)\b/)) {
      domains.push("math");
    }
    if (lower.match(/\b(physics|force|energy|quantum|relativity|gravity|wave|particle|thermodynamic|electr)\b/)) {
      domains.push("physics");
    }
    if (lower.match(/\b(symbol|logic|pattern|abstract|formal|theorem|axiom|category|structure|relation)\b/)) {
      domains.push("symbolic");
    }
    if (lower.match(/\b(find|search|research|what is|explain|history|fact|information|knowledge|who|when|where)\b/)) {
      domains.push("retrieval");
    }
    if (lower.match(/\b(plan|strategy|roadmap|step|how to|goal|milestone|schedule|timeline|phase)\b/)) {
      domains.push("planning");
    }
    if (lower.match(/\b(design|architect|system|api|database|scale|service|component|module|pattern)\b/)) {
      domains.push("architecture");
    }
    if (lower.match(/\b(route|dispatch|coordinate|optimize|distribute|balance|assign|orchestrate)\b/)) {
      domains.push("routing");
    }

    if (domains.length === 0) domains.push("retrieval", "planning");

    return res.json({ ok: true, task, domains, agentCount: domains.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/swarm/tasks", async (_req, res) => {
  try {
    const tasks = await db.select().from(swarmTasksTable).orderBy(desc(swarmTasksTable.createdAt)).limit(20);
    return res.json({ ok: true, tasks, count: tasks.length });
  } catch (err) {
    logger.error({ err }, "Failed to fetch swarm tasks");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/swarm/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const tasks = await db.select().from(swarmTasksTable).where(eq(swarmTasksTable.taskId, taskId)).limit(1);
    if (tasks.length === 0) return res.status(404).json({ ok: false, error: "Task not found" });

    const traces = await db.select().from(swarmReasoningTracesTable).where(eq(swarmReasoningTracesTable.taskId, taskId)).orderBy(swarmReasoningTracesTable.createdAt);

    return res.json({ ok: true, task: tasks[0], traces });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/swarm/tasks", async (req, res) => {
  try {
    const { task, selectedDomains, agentResults, metaReport, finalAnswer } = req.body as {
      task: string;
      selectedDomains: string[];
      agentResults: any[];
      metaReport?: any;
      finalAnswer?: string;
    };

    if (!task || typeof task !== "string") {
      return res.status(400).json({ ok: false, error: "task is required" });
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [inserted] = await db.insert(swarmTasksTable).values({
      taskId,
      task,
      selectedDomains: selectedDomains ?? [],
      agentResults: agentResults ?? [],
      metaReport: metaReport ?? null,
      finalAnswer: finalAnswer ?? null,
      status: "complete",
      agentCount: agentResults?.length ?? 0,
      overallQuality: metaReport?.overallQuality ?? null,
    }).returning();

    if (agentResults?.length > 0) {
      const traceInserts = agentResults.flatMap((r: any) =>
        (r.reasoningTrace || []).map((t: any) => ({
          taskId,
          agentId: r.agentId,
          agentName: r.agentName,
          domain: r.domain,
          phase: t.phase,
          content: t.content?.slice(0, 2000) ?? "",
          quality: t.quality ?? null,
          selfAssessmentScore: r.selfAssessmentScore ?? null,
        }))
      );
      if (traceInserts.length > 0) {
        await db.insert(swarmReasoningTracesTable).values(traceInserts);
      }
    }

    const rawToken = req.headers["x-admin-token"];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const keyHash = validateMeshToken(token ?? "");
    if (keyHash) {
      meshBroadcast(keyHash, "swarm:task-saved", {
        taskId,
        task: task.slice(0, 120),
        domains: selectedDomains ?? [],
        agentCount: agentResults?.length ?? 0,
        quality: metaReport?.overallQuality ?? null,
      });
    }

    return res.json({ ok: true, taskId, task: inserted });
  } catch (err) {
    logger.error({ err }, "Failed to save swarm task");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/swarm/metacognition/reports", async (_req, res) => {
  try {
    const tasks = await db
      .select()
      .from(swarmTasksTable)
      .orderBy(desc(swarmTasksTable.createdAt))
      .limit(10);

    const reports = tasks
      .filter(t => t.metaReport)
      .map(t => ({
        taskId: t.taskId,
        task: t.task,
        overallQuality: t.overallQuality,
        metaReport: t.metaReport,
        agentCount: t.agentCount,
        createdAt: t.createdAt,
      }));

    return res.json({ ok: true, reports, count: reports.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/swarm/reasoning-traces", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const domain = req.query.domain ? String(req.query.domain) : undefined;

    let query = db.select().from(swarmReasoningTracesTable).orderBy(desc(swarmReasoningTracesTable.createdAt)).$dynamic();

    if (domain) {
      query = query.where(eq(swarmReasoningTracesTable.domain, domain));
    }

    const traces = await query.limit(limit);
    return res.json({ ok: true, traces, count: traces.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
