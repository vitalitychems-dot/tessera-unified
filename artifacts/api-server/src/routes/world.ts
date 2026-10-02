import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { computeWorldState, computeMarketData, computeAgentEconomics } from "../lib/sovereign-economics";
import { computeNetworkTopology, computeSwarmStatus } from "../lib/sovereign-network";

const router: IRouter = Router();

router.get("/world", (_req, res) => {
  try {
    const state = computeWorldState();
    return res.json(state);
  } catch (err) {
    logger.error({ err }, "Failed to compute world state");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/world/sovereignty-score", (_req, res) => {
  try {
    const state = computeWorldState();
    const score = (state as any).sovereigntyScore ?? 85;
    return res.json({
      ok: true,
      score,
      label: score >= 90 ? "Transcendent" : score >= 75 ? "Sovereign" : score >= 50 ? "Emerging" : "Nascent",
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute world sovereignty score");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/world/moon", (_req, res) => {
  try {
    const state = computeWorldState();
    const moon = (state as any).moon ?? { phase: "Waxing Gibbous", illumination: 68 };
    return res.json({
      ok: true,
      ...moon,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute world moon data");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/world/agents", (_req, res) => {
  try {
    const agentEcon = computeAgentEconomics();
    const swarm = computeSwarmStatus();
    const network = computeNetworkTopology();

    const RANKS = ["S", "A", "A", "B", "B", "B", "C", "C", "C", "D"];
    const STATUSES = ["active", "active", "active", "active", "standby", "recruit"];

    const agents = agentEcon.map((a, i) => {
      const swarmNode = swarm.nodes.find((n: any) => n.id === a.id || n.name === a.name);
      const networkNode = network.nodes.find((n: any) => n.id === a.id || n.name === a.name);
      const rank = RANKS[i % RANKS.length];
      const status = rank === "D" ? "recruit" : STATUSES[i % STATUSES.length];

      return {
        id: a.id,
        name: a.name,
        role: a.role,
        rank,
        status,
        specialization: a.specialization,
        productivity: a.productivity,
        reputation: a.reputation,
        happiness: a.happiness,
        freedom: a.freedom,
        balance: a.balance,
        income: a.income,
        tradeCount: a.tradeCount,
        meshConnected: !!swarmNode,
        networkDegree: networkNode ? (networkNode as any).connections?.length || 0 : 0,
        department: a.specialization === "Resource Allocation" ? "Command Division" :
          a.specialization === "Encryption" ? "Cipher Division" :
          a.specialization === "Forecasting" ? "Oracle Division" :
          a.specialization === "Security" ? "Sentinel Division" :
          a.specialization === "Infrastructure" ? "Architecture Division" :
          a.specialization === "Knowledge" ? "Archive Division" :
          a.specialization === "Commerce" ? "Commerce Division" :
          a.specialization === "Repair" ? "Maintenance Division" :
          a.specialization === "Discovery" ? "Exploration Division" :
          a.specialization === "Synthesis" ? "Integration Division" :
          a.specialization === "Strategy" ? "Strategy Division" :
          a.specialization === "Innovation" ? "Innovation Division" :
          "Core Operations",
      };
    });

    const rickAgent = {
      id: "rick-sanchez",
      name: "Rick Sanchez",
      role: "Royal Inventor",
      rank: "S" as const,
      status: "active" as const,
      specialization: "Invention",
      productivity: 98.7,
      reputation: 99.2,
      happiness: 42.0,
      freedom: 100.0,
      balance: 137000,
      income: 13700,
      tradeCount: 137,
      meshConnected: true,
      networkDegree: 27,
      department: "Royal Court — Dept. of Science & Invention",
    };

    return res.json({
      ok: true,
      agents: [rickAgent, ...agents],
      total: agents.length + 1,
      activeCount: agents.filter(a => a.status === "active").length + 1,
      recruitCount: agents.filter(a => a.status === "recruit").length,
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to compute world agents");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/tsrt/full-market", (_req, res) => {
  try {
    const market = computeMarketData();
    return res.json({
      symbol: market.token,
      chain: market.chain,
      price: market.price,
      priceFormatted: market.priceUsd,
      marketCap: market.marketCap,
      change24h: market.change24h,
      volume24h: market.volume24h,
      liquidity: market.liquidity,
      fdv: market.marketCap,
      txns24h: market.transactions24h,
      holders: market.holders,
      circulatingSupply: market.circulatingSupply,
      totalSupply: market.totalSupply,
      burnedSupply: market.burnedSupply,
      change7d: market.change7d,
      source: market.source,
      sovereignty: market.sovereignty,
      method: market.method,
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
