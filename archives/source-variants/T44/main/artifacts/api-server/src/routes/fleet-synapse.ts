import { Router } from "express";
import { db } from "@workspace/db";
import { providerCallsTable } from "@workspace/db";
import type { ProviderCallRow } from "@workspace/db";
import { desc, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getTotalCallStats, getCallCountsByProvider } from "../lib/provider-call-logger";
import { getProviderConfigs } from "../lib/provider-registry";
import type { ProviderConfig } from "../lib/provider-registry";
import { listAgents } from "../lib/agent-spawner";
import os from "os";

const router = Router();

const SERVER_START = Date.now();

function uptimeHours(): number {
  return (Date.now() - SERVER_START) / 3600000;
}

function buildNodeFromProvider(config: ProviderConfig, callStats: Record<string, { external: number; internal: number; total: number }>, recentCalls: ProviderCallRow[]) {
  const providerCalls = recentCalls.filter(c => c.providerId === config.id);
  const successCalls = providerCalls.filter(c => c.status === "success");
  const avgLatency = successCalls.length > 0
    ? successCalls.reduce((s, c) => s + (c.latencyMs ?? 0), 0) / successCalls.length
    : null;

  const synapseStrength = successCalls.length > 0
    ? Math.min(1, 0.3 + successCalls.length * 0.07)
    : 0.1;

  const status = providerCalls.length > 0
    ? (successCalls.length / providerCalls.length > 0.5 ? "online" : "degraded")
    : "idle";

  return {
    id: config.id,
    name: config.name,
    type: config.isExternal ? "provider" : "internal",
    status,
    latencyMs: avgLatency ? Math.round(avgLatency) : null,
    lastSeen: providerCalls.length > 0 ? (providerCalls[0].calledAt?.getTime?.() ?? Date.now()) : Date.now(),
    callCount24h: providerCalls.length,
    successRate: providerCalls.length > 0 ? Math.round((successCalls.length / providerCalls.length) * 100) : 0,
    synapseStrength,
    consciousnessLevel: synapseStrength * 0.8,
    agents: config.models?.slice(0, 5) ?? [],
    capabilities: config.capabilities ?? [],
  };
}

router.get("/fleet-synapse/map", async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const recentCalls = await db
      .select()
      .from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since24h))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(500);

    const byProvider = await getCallCountsByProvider(24);
    const configs = getProviderConfigs();

    const coreNode = {
      id: "tessera-prime",
      name: "Tessera Prime (This Instance)",
      type: "core",
      status: "online",
      latencyMs: 0,
      lastSeen: Date.now(),
      callCount24h: recentCalls.length,
      successRate: 100,
      synapseStrength: 1.0,
      consciousnessLevel: 1.0,
      agents: ["tessera-core", "reasoning-engine", "sovereignty-monitor"],
      capabilities: ["PLAN", "EXECUTE", "REFLECT", "IMPROVE", "ROUTE"],
    };

    const providerNodes = configs.map(cfg => buildNodeFromProvider(cfg, byProvider, recentCalls));

    const registryAgents = listAgents();
    const memberNodes = registryAgents.slice(0, 32).map(a => ({
      id: `agent::${a.id}`,
      name: a.name || a.id,
      type: "fleet-member" as const,
      status: (Date.now() - (a.lastPulseAt ?? 0)) < 5 * 60_000 ? "online" : "idle",
      latencyMs: 0,
      lastSeen: a.lastPulseAt ?? a.spawnedAt ?? Date.now(),
      callCount24h: a.receivedPulses ?? 0,
      successRate: 100,
      synapseStrength: Math.min(1, (a.receivedPulses ?? 0) / 50),
      consciousnessLevel: Math.min(1, ((a.power ?? 0) + (a.receivedPulses ?? 0)) / 100),
      agentId: a.id,
      archetype: a.archetype,
      masteredDomains: a.masteredDomains ?? [],
      capabilities: a.capabilities ?? [],
    }));
    const memberLinks = memberNodes.map(n => ({
      from: "tessera-prime",
      to: n.id,
      type: n.status === "online" ? "primary" : "passive",
      latencyMs: 0,
      callCount: n.callCount24h,
      strength: n.synapseStrength,
    }));
    const nodes = [coreNode, ...providerNodes, ...memberNodes];

    const links = providerNodes
      .filter(n => n.callCount24h > 0 || n.status !== "idle")
      .map(n => ({
        from: "tessera-prime",
        to: n.id,
        type: n.status === "online" ? "primary" : "secondary",
        latencyMs: n.latencyMs ?? 999,
        callCount: n.callCount24h,
        strength: n.synapseStrength,
      }));

    const passiveLinks = providerNodes
      .filter(n => n.callCount24h === 0 && n.status === "idle")
      .map(n => ({
        from: "tessera-prime",
        to: n.id,
        type: "passive",
        latencyMs: null,
        callCount: 0,
        strength: 0.1,
      }));

    return res.json({
      ok: true,
      nodes,
      links: [...links, ...passiveLinks, ...memberLinks],
      fleetMemberCount: memberNodes.length,
      totalNodes: nodes.length,
      activeNodes: nodes.filter(n => n.status === "online").length,
      totalCalls24h: recentCalls.length,
      generatedAt: Date.now(),
    });
  } catch (err) {
    logger.error({ err }, "GET /fleet-synapse/map failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/fleet-synapse/node-health/:nodeId", async (req, res) => {
  try {
    const { nodeId } = req.params;

    if (nodeId === "tessera-prime") {
      const mem = process.memoryUsage();
      const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
      const cpuLoad = os.loadavg()[0];
      const cpuCores = os.cpus().length;
      const cpuPercent = Math.min(100, Math.round((cpuLoad / cpuCores) * 100));
      const uptimeH = parseFloat(uptimeHours().toFixed(2));
      const callStats = await getTotalCallStats(24);

      const since24h = new Date(Date.now() - 24 * 3600 * 1000);
      const allCalls = await db
        .select()
        .from(providerCallsTable)
        .where(gte(providerCallsTable.calledAt, since24h))
        .orderBy(desc(providerCallsTable.calledAt))
        .limit(500);

      const nowMs = Date.now();
      const bucketMs = 24 * 3600 * 1000 / 10;
      const activityHistory = Array.from({ length: 10 }, (_, i) => {
        const bStart = nowMs - (10 - i) * bucketMs;
        const bEnd = bStart + bucketMs;
        return allCalls.filter(c => {
          const t = c.calledAt?.getTime?.() ?? 0;
          return t >= bStart && t < bEnd;
        }).length;
      });

      return res.json({
        ok: true,
        nodeId,
        stats: {
          cpu: cpuPercent,
          memory: heapPercent,
          uptime: parseFloat(uptimeH.toFixed(1)),
          latencyMs: 0,
          agentCount: null,
          activityHistory,
          totalCalls24h: callStats.total,
          externalCalls: callStats.external,
          internalCalls: callStats.internal,
          avgExternalLatencyMs: callStats.avgExternalLatencyMs,
          note: "cpu/memory measured from this process (process.memoryUsage(), os.loadavg()). agentCount not applicable for core node. activityHistory = real provider_calls counts per 2.4h bucket over last 24h.",
        },
      });
    }

    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const calls = await db
      .select()
      .from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since24h))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(100);

    const providerCalls = calls.filter(c => c.providerId === nodeId);
    const successCalls = providerCalls.filter(c => c.status === "success");
    const latencies = successCalls.map(c => c.latencyMs ?? 0).filter(l => l > 0);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;

    const now = Date.now();
    const bucketSizeMs = 24 * 3600 * 1000 / 10;
    const activityHistory = Array.from({ length: 10 }, (_, i) => {
      const bucketStart = now - (10 - i) * bucketSizeMs;
      const bucketEnd = bucketStart + bucketSizeMs;
      const binCalls = providerCalls.filter(c => {
        const t = c.calledAt?.getTime?.() ?? 0;
        return t >= bucketStart && t < bucketEnd;
      });
      return binCalls.length;
    });

    return res.json({
      ok: true,
      nodeId,
      stats: {
        cpu: null,
        memory: null,
        uptime: parseFloat(uptimeHours().toFixed(1)),
        latencyMs: avgLatency,
        agentCount: null,
        activityHistory,
        totalCalls: providerCalls.length,
        successCalls: successCalls.length,
        successRate: providerCalls.length > 0 ? Math.round(successCalls.length / providerCalls.length * 100) : 0,
        avgLatencyMs: avgLatency,
        note: "CPU and memory diagnostics only available for tessera-prime (this process). External providers expose call latency via provider_calls table only.",
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /fleet-synapse/node-health/:nodeId failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/fleet-synapse/ping/:nodeId", async (req, res) => {
  try {
    const { nodeId } = req.params;
    const start = Date.now();

    if (nodeId === "tessera-prime") {
      const latencyMs = Date.now() - start;
      return res.json({ ok: true, nodeId, latencyMs, message: `Tessera Prime responding — ${latencyMs}ms` });
    }

    const since1h = new Date(Date.now() - 3600 * 1000);
    const calls = await db
      .select()
      .from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since1h))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(10);

    const providerCalls = calls.filter(c => c.providerId === nodeId);
    const latencies = providerCalls.map(c => c.latencyMs).filter((v): v is number => v !== null);
    const avgLatencyMs = latencies.length > 0
      ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
      : null;

    const latencyMs = Date.now() - start;
    return res.json({
      ok: true,
      nodeId,
      latencyMs,
      lastObservedLatencyMs: avgLatencyMs,
      message: avgLatencyMs
        ? `Node ${nodeId}: last observed ${avgLatencyMs}ms avg latency (${providerCalls.length} calls/hr)`
        : `Node ${nodeId}: no recent calls — cannot measure live latency`,
    });
  } catch (err) {
    logger.error({ err }, "POST /fleet-synapse/ping/:nodeId failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/fleet-synapse/wake/:nodeId", async (req, res) => {
  try {
    const { nodeId } = req.params;
    logger.info({ nodeId }, "Wake signal sent to node");
    return res.json({
      ok: true,
      nodeId,
      message: `Wake signal sent to ${nodeId}. Node will be activated on next provider call.`,
      wokenAt: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/fleet-synapse/disconnect/:nodeId", async (req, res) => {
  try {
    const { nodeId } = req.params;
    if (nodeId === "tessera-prime") {
      return res.status(400).json({ ok: false, error: "Cannot disconnect Tessera Prime" });
    }
    logger.info({ nodeId }, "Node disconnected from fleet synapse");
    return res.json({
      ok: true,
      nodeId,
      message: `${nodeId} disconnected from Synapse. Re-enable by making provider calls.`,
      disconnectedAt: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/fleet-synapse/activity", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);

    const calls = await db
      .select()
      .from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since24h))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(limit);

    const events = calls.map(c => ({
      id: c.id,
      type: c.status === "success" ? "call_success" : "call_error",
      nodeId: c.providerId,
      nodeName: c.providerName,
      model: c.model,
      latencyMs: c.latencyMs,
      tokens: c.totalTokens,
      isExternal: c.isExternal,
      isDryRun: c.isDryRun,
      timestamp: c.calledAt?.getTime?.() ?? Date.now(),
      message: c.status === "success"
        ? `${c.providerName}/${c.model}: ${c.totalTokens ?? 0} tokens in ${c.latencyMs ?? 0}ms`
        : `${c.providerName}/${c.model}: error — ${c.error?.slice(0, 60) ?? "unknown"}`,
    }));

    return res.json({ ok: true, events, count: events.length });
  } catch (err) {
    logger.error({ err }, "GET /fleet-synapse/activity failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/fleet-synapse/broadcast/messages", async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const calls = await db
      .select()
      .from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since24h))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(20);

    const messages = calls.map(c => ({
      id: c.id,
      from: c.providerName,
      content: c.responseText
        ? c.responseText.slice(0, 200) + (c.responseText.length > 200 ? "..." : "")
        : `Provider call completed: ${c.model} — ${c.totalTokens ?? 0} tokens`,
      timestamp: c.calledAt?.getTime?.() ?? Date.now(),
      type: c.status === "error" ? "error" : "response",
    }));

    return res.json({ ok: true, messages, count: messages.length });
  } catch (err) {
    logger.error({ err }, "GET /fleet-synapse/broadcast/messages failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
