import { db } from "@workspace/db";
import {
  routingDecisionsTable,
  providerCallsTable,
  providerProfilesTable,
} from "@workspace/db/schema";
import { desc, gte } from "drizzle-orm";
import { logger } from "./logger";

export interface GraphNode {
  id: string;
  label: string;
  type: "agent" | "provider" | "coordinator" | "tool" | "data-source";
  domain?: string;
  load: number;
  capacity: number;
  latencyMs: number;
  errorRate: number;
  reliabilityScore: number;
  capabilityScore: number;
  isExternal: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  latencyMs: number;
  bandwidth: number;
  reliability: number;
}

export interface RoutingGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  lastUpdated: number;
}

export interface RoutingDecision {
  selectedAgent: string;
  selectedProvider: string;
  pathTaken: string[];
  edgeWeightsUsed: Record<string, number>;
  latencyMs: number;
  algorithm: string;
  loadBalancedAway: boolean;
  reasoning: string;
}

const AGENT_NODES: GraphNode[] = [
  { id: "swarm-coordinator", label: "Swarm Coordinator", type: "coordinator", load: 0, capacity: 100, latencyMs: 5, errorRate: 0, reliabilityScore: 99, capabilityScore: 95, isExternal: false },
  { id: "math-agent", label: "Euler (Math)", type: "agent", domain: "math", load: 0, capacity: 5, latencyMs: 1000, errorRate: 0.02, reliabilityScore: 92, capabilityScore: 88, isExternal: false },
  { id: "physics-agent", label: "Curie (Physics)", type: "agent", domain: "physics", load: 0, capacity: 5, latencyMs: 1000, errorRate: 0.02, reliabilityScore: 91, capabilityScore: 87, isExternal: false },
  { id: "symbolic-agent", label: "Noether (Symbolic)", type: "agent", domain: "symbolic", load: 0, capacity: 5, latencyMs: 1000, errorRate: 0.03, reliabilityScore: 90, capabilityScore: 85, isExternal: false },
  { id: "retrieval-agent", label: "Athena (Retrieval)", type: "agent", domain: "retrieval", load: 0, capacity: 5, latencyMs: 1200, errorRate: 0.02, reliabilityScore: 93, capabilityScore: 86, isExternal: false },
  { id: "planning-agent", label: "Minerva (Planning)", type: "agent", domain: "planning", load: 0, capacity: 5, latencyMs: 1100, errorRate: 0.02, reliabilityScore: 91, capabilityScore: 89, isExternal: false },
  { id: "architecture-agent", label: "Ada (Architecture)", type: "agent", domain: "architecture", load: 0, capacity: 5, latencyMs: 1000, errorRate: 0.01, reliabilityScore: 94, capabilityScore: 90, isExternal: false },
  { id: "routing-agent", label: "Iris (Routing)", type: "agent", domain: "routing", load: 0, capacity: 5, latencyMs: 800, errorRate: 0.01, reliabilityScore: 95, capabilityScore: 88, isExternal: false },
  { id: "meta-agent", label: "Meta Agent", type: "agent", domain: "meta" as any, load: 0, capacity: 10, latencyMs: 50, errorRate: 0, reliabilityScore: 98, capabilityScore: 92, isExternal: false },
];

const PROVIDER_NODES: GraphNode[] = [
  { id: "provider-anthropic", label: "Anthropic", type: "provider", load: 0, capacity: 50, latencyMs: 1200, errorRate: 0.01, reliabilityScore: 99, capabilityScore: 95, isExternal: true },
  { id: "provider-openai", label: "OpenAI", type: "provider", load: 0, capacity: 50, latencyMs: 1100, errorRate: 0.01, reliabilityScore: 99, capabilityScore: 93, isExternal: true },
  { id: "provider-google", label: "Google", type: "provider", load: 0, capacity: 50, latencyMs: 900, errorRate: 0.015, reliabilityScore: 97, capabilityScore: 90, isExternal: true },
  { id: "provider-deepseek", label: "DeepSeek", type: "provider", load: 0, capacity: 50, latencyMs: 1300, errorRate: 0.02, reliabilityScore: 94, capabilityScore: 82, isExternal: true },
  { id: "provider-mistral", label: "Mistral", type: "provider", load: 0, capacity: 50, latencyMs: 1000, errorRate: 0.02, reliabilityScore: 95, capabilityScore: 78, isExternal: true },
  { id: "provider-xai", label: "xAI", type: "provider", load: 0, capacity: 50, latencyMs: 1400, errorRate: 0.03, reliabilityScore: 92, capabilityScore: 80, isExternal: true },
  { id: "provider-ollama", label: "Ollama (Local)", type: "provider", load: 0, capacity: 10, latencyMs: 3000, errorRate: 0.1, reliabilityScore: 70, capabilityScore: 60, isExternal: false },
];

const BASE_EDGES: Array<Omit<GraphEdge, "weight">> = [
  { from: "swarm-coordinator", to: "math-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "physics-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "symbolic-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "retrieval-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "planning-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "architecture-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "routing-agent", latencyMs: 5, bandwidth: 100, reliability: 0.99 },
  { from: "swarm-coordinator", to: "meta-agent", latencyMs: 3, bandwidth: 200, reliability: 1.0 },
  { from: "math-agent", to: "provider-deepseek", latencyMs: 1300, bandwidth: 50, reliability: 0.94 },
  { from: "math-agent", to: "provider-openai", latencyMs: 1100, bandwidth: 50, reliability: 0.99 },
  { from: "physics-agent", to: "provider-google", latencyMs: 900, bandwidth: 50, reliability: 0.97 },
  { from: "symbolic-agent", to: "provider-anthropic", latencyMs: 1200, bandwidth: 50, reliability: 0.99 },
  { from: "retrieval-agent", to: "provider-openai", latencyMs: 1100, bandwidth: 50, reliability: 0.99 },
  { from: "planning-agent", to: "provider-xai", latencyMs: 1400, bandwidth: 50, reliability: 0.92 },
  { from: "architecture-agent", to: "provider-anthropic", latencyMs: 1200, bandwidth: 50, reliability: 0.99 },
  { from: "routing-agent", to: "provider-mistral", latencyMs: 1000, bandwidth: 50, reliability: 0.95 },
  { from: "math-agent", to: "provider-ollama", latencyMs: 3000, bandwidth: 10, reliability: 0.70 },
];

let cachedGraph: RoutingGraph | null = null;
let cacheExpiry = 0;

export async function buildLiveRoutingGraph(): Promise<RoutingGraph> {
  if (cachedGraph && Date.now() < cacheExpiry) {
    return cachedGraph;
  }

  const nodes = new Map<string, GraphNode>();

  for (const node of [...AGENT_NODES, ...PROVIDER_NODES]) {
    nodes.set(node.id, { ...node });
  }

  try {
    const profiles = await db.select().from(providerProfilesTable);
    for (const profile of profiles) {
      const nodeId = `provider-${profile.providerId}`;
      const existing = nodes.get(nodeId);
      if (existing) {
        existing.latencyMs = profile.avgLatencyMs ?? existing.latencyMs;
        existing.errorRate = profile.errorRate ?? existing.errorRate;
        existing.reliabilityScore = profile.reliabilityScore ?? existing.reliabilityScore;
        existing.capabilityScore = profile.capabilityScore ?? existing.capabilityScore;
        nodes.set(nodeId, existing);
      }
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recentCalls = await db.select().from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since))
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(200);

    const callCountByProvider = new Map<string, number>();
    for (const call of recentCalls) {
      const nodeId = `provider-${call.providerId}`;
      callCountByProvider.set(nodeId, (callCountByProvider.get(nodeId) ?? 0) + 1);
    }

    for (const [nodeId, count] of callCountByProvider) {
      const node = nodes.get(nodeId);
      if (node) {
        node.load = Math.min(node.capacity, Math.round(count / 5));
        nodes.set(nodeId, node);
      }
    }
  } catch (err) {
    logger.warn({ err }, "Could not load live metrics for routing graph, using defaults");
  }

  const edges: GraphEdge[] = BASE_EDGES.map(e => {
    const fromNode = nodes.get(e.from);
    const toNode = nodes.get(e.to);

    const latencyPenalty = toNode ? (toNode.latencyMs / 1000) : 1;
    const loadPenalty = toNode ? (1 + (toNode.load / toNode.capacity) * 0.5) : 1;
    const reliabilityBonus = 1 / (e.reliability + 0.01);

    const weight = latencyPenalty * loadPenalty * reliabilityBonus;

    return { ...e, weight: Math.round(weight * 100) / 100 };
  });

  cachedGraph = { nodes, edges, lastUpdated: Date.now() };
  cacheExpiry = Date.now() + 30_000;

  return cachedGraph;
}

export function dijkstra(graph: RoutingGraph, start: string, goal: string): { path: string[]; totalWeight: number } {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const [id] of graph.nodes) {
    dist.set(id, Infinity);
    prev.set(id, null);
    unvisited.add(id);
  }
  dist.set(start, 0);

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      const d = dist.get(node) ?? Infinity;
      if (d < minDist) { minDist = d; u = node; }
    }

    if (u === null || u === goal) break;
    unvisited.delete(u);

    const outEdges = graph.edges.filter(e => e.from === u);
    for (const edge of outEdges) {
      if (!unvisited.has(edge.to)) continue;
      const alt = (dist.get(u) ?? Infinity) + edge.weight;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
      }
    }
  }

  const path: string[] = [];
  let current: string | null = goal;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  if (path[0] !== start) return { path: [start, goal], totalWeight: Infinity };
  return { path, totalWeight: dist.get(goal) ?? Infinity };
}

export async function selectOptimalRoute(
  task: string,
  domains: string[],
): Promise<RoutingDecision> {
  const graph = await buildLiveRoutingGraph();

  const agentDomainMap: Record<string, string> = {
    math: "math-agent",
    physics: "physics-agent",
    symbolic: "symbolic-agent",
    retrieval: "retrieval-agent",
    planning: "planning-agent",
    architecture: "architecture-agent",
    routing: "routing-agent",
  };

  const targetDomain = domains[0] ?? "retrieval";
  let targetAgentId = agentDomainMap[targetDomain] ?? "retrieval-agent";

  const agentNode = graph.nodes.get(targetAgentId);
  let loadBalancedAway = false;

  if (agentNode && agentNode.load >= agentNode.capacity * 0.8) {
    const alternatives = domains.slice(1).map(d => agentDomainMap[d]).filter(Boolean);
    for (const alt of alternatives) {
      const altNode = graph.nodes.get(alt);
      if (altNode && altNode.load < altNode.capacity * 0.8) {
        targetAgentId = alt;
        loadBalancedAway = true;
        break;
      }
    }
  }

  const { path, totalWeight } = dijkstra(graph, "swarm-coordinator", targetAgentId);

  const edgeWeightsUsed: Record<string, number> = {};
  for (let i = 0; i < path.length - 1; i++) {
    const edgeKey = `${path[i]}->${path[i + 1]}`;
    const edge = graph.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
    edgeWeightsUsed[edgeKey] = edge?.weight ?? 0;
  }

  const agentNodeFinal = graph.nodes.get(targetAgentId);
  const agentEdges = graph.edges.filter(e => e.from === targetAgentId);
  const providerEdge = agentEdges.sort((a, b) => a.weight - b.weight)[0];
  const selectedProvider = providerEdge?.to ?? "provider-anthropic";
  const providerNode = graph.nodes.get(selectedProvider);

  const latencyMs = (agentNodeFinal?.latencyMs ?? 1000) + (providerNode?.latencyMs ?? 1000);

  const decision: RoutingDecision = {
    selectedAgent: targetAgentId,
    selectedProvider,
    pathTaken: path,
    edgeWeightsUsed,
    latencyMs,
    algorithm: "dijkstra",
    loadBalancedAway,
    reasoning: `Dijkstra shortest-path from swarm-coordinator to ${targetAgentId} (domain: ${targetDomain}). Total weight: ${totalWeight.toFixed(2)}. Provider selected: ${selectedProvider} (lowest weight edge). Load-balanced: ${loadBalancedAway}.`,
  };

  try {
    const decisionId = `rd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(routingDecisionsTable).values({
      decisionId,
      taskDescription: task.slice(0, 200),
      taskDomains: domains,
      selectedAgent: decision.selectedAgent,
      selectedProvider: decision.selectedProvider,
      pathTaken: decision.pathTaken,
      edgeWeightsUsed: decision.edgeWeightsUsed,
      latencyMs: decision.latencyMs,
      loadBalancedAway: decision.loadBalancedAway,
      algorithm: decision.algorithm,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to persist routing decision");
  }

  return decision;
}

export function invalidateGraphCache() {
  cachedGraph = null;
  cacheExpiry = 0;
}
