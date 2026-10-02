import * as os from "os";

interface NetworkNode {
  id: string;
  name: string;
  type: string;
  status: string;
  uptime: number;
  latencyMs: number;
  throughput: number;
  connections: string[];
  load: number;
  memoryUsage: number;
  cpuUsage: number;
  region: string;
  coordinates: { x: number; y: number };
}

interface RoutingEdge {
  from: string;
  to: string;
  weight: number;
  latencyMs: number;
  bandwidth: number;
  reliability: number;
}

const NODE_DEFINITIONS = [
  { id: "nexus-core", name: "Nexus Core", type: "orchestrator", region: "central" },
  { id: "cipher-vault", name: "Cipher Vault", type: "security", region: "north" },
  { id: "oracle-engine", name: "Oracle Engine", type: "prediction", region: "east" },
  { id: "sentinel-gate", name: "Sentinel Gate", type: "firewall", region: "west" },
  { id: "architect-lab", name: "Architect Lab", type: "builder", region: "south" },
  { id: "librarian-index", name: "Librarian Index", type: "knowledge", region: "northeast" },
  { id: "merchant-exchange", name: "Merchant Exchange", type: "commerce", region: "southeast" },
  { id: "healer-node", name: "Healer Node", type: "maintenance", region: "northwest" },
  { id: "scout-probe", name: "Scout Probe", type: "discovery", region: "southwest" },
  { id: "weaver-mesh", name: "Weaver Mesh", type: "integration", region: "central-north" },
  { id: "sage-council", name: "Sage Council", type: "governance", region: "central-south" },
  { id: "artisan-forge", name: "Artisan Forge", type: "creation", region: "central-east" },
  { id: "lattice-relay-1", name: "Lattice Relay Alpha", type: "relay", region: "far-north" },
  { id: "lattice-relay-2", name: "Lattice Relay Beta", type: "relay", region: "far-south" },
  { id: "lattice-relay-3", name: "Lattice Relay Gamma", type: "relay", region: "far-east" },
  { id: "lattice-relay-4", name: "Lattice Relay Delta", type: "relay", region: "far-west" },
];

const REGION_COORDS: Record<string, { x: number; y: number }> = {
  central: { x: 0, y: 0 },
  north: { x: 0, y: -200 },
  south: { x: 0, y: 200 },
  east: { x: 200, y: 0 },
  west: { x: -200, y: 0 },
  northeast: { x: 150, y: -150 },
  southeast: { x: 150, y: 150 },
  northwest: { x: -150, y: -150 },
  southwest: { x: -150, y: 150 },
  "central-north": { x: 0, y: -100 },
  "central-south": { x: 0, y: 100 },
  "central-east": { x: 100, y: 0 },
  "far-north": { x: 50, y: -350 },
  "far-south": { x: -50, y: 350 },
  "far-east": { x: 350, y: 50 },
  "far-west": { x: -350, y: -50 },
};

function deterministicRandom(seed: number): number {
  let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeNodeMetrics(nodeId: string, now: number): { load: number; cpu: number; memory: number; uptime: number } {
  const uptimeMs = now - 1700000000000;
  const hours = uptimeMs / 3600000;
  const dayPhase = (new Date(now).getUTCHours()) / 24;
  const seed = Math.abs(nodeId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));

  const baseLoad = 0.3 + 0.2 * Math.sin(dayPhase * Math.PI * 2);
  const nodeVariance = deterministicRandom(seed + Math.floor(now / 60000)) * 0.3;
  const load = Math.min(0.95, baseLoad + nodeVariance);

  const baseCpu = 0.15 + load * 0.5;
  const cpuNoise = deterministicRandom(seed + Math.floor(now / 30000) + 1) * 0.15;

  const baseMemory = 0.4 + load * 0.3;
  const memNoise = deterministicRandom(seed + Math.floor(now / 120000) + 2) * 0.1;

  return {
    load: Math.round(load * 10000) / 100,
    cpu: Math.round(Math.min(0.99, baseCpu + cpuNoise) * 10000) / 100,
    memory: Math.round(Math.min(0.95, baseMemory + memNoise) * 10000) / 100,
    uptime: Math.round(hours * 100) / 100,
  };
}

function computeEdgeMetrics(from: { x: number; y: number }, to: { x: number; y: number }, now: number, edgeId: string) {
  const dist = distance(from, to);
  const baseLatency = 1 + dist * 0.05;
  const seed = Math.abs(edgeId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
  const jitter = deterministicRandom(seed + Math.floor(now / 10000)) * 2;
  const latency = Math.round((baseLatency + jitter) * 100) / 100;
  const bandwidth = Math.round((1000 - dist * 1.5) * (0.8 + deterministicRandom(seed + 3) * 0.4));
  const reliability = Math.round((0.95 + deterministicRandom(seed + 7) * 0.05) * 10000) / 100;
  const weight = latency / reliability * 100;

  return { latencyMs: latency, bandwidth: Math.max(100, bandwidth), reliability, weight: Math.round(weight * 100) / 100 };
}

function buildTopology(now: number): { nodes: NetworkNode[]; edges: RoutingEdge[] } {
  const nodes: NetworkNode[] = NODE_DEFINITIONS.map(def => {
    const coords = REGION_COORDS[def.region] || { x: 0, y: 0 };
    const metrics = computeNodeMetrics(def.id, now);
    return {
      id: def.id,
      name: def.name,
      type: def.type,
      status: metrics.load < 80 ? "healthy" : metrics.load < 90 ? "degraded" : "critical",
      uptime: metrics.uptime,
      latencyMs: 0,
      throughput: Math.round(1000 * (1 - metrics.load / 100)),
      connections: [],
      load: metrics.load,
      memoryUsage: metrics.memory,
      cpuUsage: metrics.cpu,
      region: def.region,
      coordinates: coords,
    };
  });

  const edges: RoutingEdge[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = distance(nodes[i].coordinates, nodes[j].coordinates);
      if (dist < 300 || nodes[i].type === "orchestrator" || nodes[j].type === "orchestrator" || nodes[i].type === "relay" || nodes[j].type === "relay") {
        const edgeId = `${nodes[i].id}-${nodes[j].id}`;
        const metrics = computeEdgeMetrics(nodes[i].coordinates, nodes[j].coordinates, now, edgeId);
        edges.push({ from: nodes[i].id, to: nodes[j].id, ...metrics });
        nodes[i].connections.push(nodes[j].id);
        nodes[j].connections.push(nodes[i].id);
      }
    }
  }

  return { nodes, edges };
}

function dijkstra(nodes: NetworkNode[], edges: RoutingEdge[], startId: string, endId: string): { path: string[]; totalWeight: number; totalLatency: number } {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const n of nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(startId, 0);

  while (visited.size < nodes.length) {
    let minNode: string | null = null;
    let minDist = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < minDist) {
        minDist = d;
        minNode = id;
      }
    }
    if (minNode === null || minNode === endId) break;
    visited.add(minNode);

    for (const edge of edges) {
      let neighbor: string | null = null;
      if (edge.from === minNode) neighbor = edge.to;
      else if (edge.to === minNode) neighbor = edge.from;
      if (neighbor && !visited.has(neighbor)) {
        const alt = (dist.get(minNode) || 0) + edge.weight;
        if (alt < (dist.get(neighbor) || Infinity)) {
          dist.set(neighbor, alt);
          prev.set(neighbor, minNode);
        }
      }
    }
  }

  const path: string[] = [];
  let current: string | null = endId;
  let totalLatency = 0;
  while (current) {
    path.unshift(current);
    const p = prev.get(current);
    if (p) {
      const edge = edges.find(e => (e.from === p && e.to === current) || (e.to === p && e.from === current));
      if (edge) totalLatency += edge.latencyMs;
    }
    current = p || null;
  }

  return {
    path,
    totalWeight: Math.round((dist.get(endId) || Infinity) * 100) / 100,
    totalLatency: Math.round(totalLatency * 100) / 100,
  };
}

export function computeNetworkTopology(now: number = Date.now()) {
  const { nodes, edges } = buildTopology(now);

  const healthyCount = nodes.filter(n => n.status === "healthy").length;
  const avgLoad = nodes.reduce((s, n) => s + n.load, 0) / nodes.length;
  const avgLatency = edges.reduce((s, e) => s + e.latencyMs, 0) / edges.length;
  const avgReliability = edges.reduce((s, e) => s + e.reliability, 0) / edges.length;

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      healthyNodes: healthyCount,
      degradedNodes: nodes.filter(n => n.status === "degraded").length,
      criticalNodes: nodes.filter(n => n.status === "critical").length,
      totalEdges: edges.length,
      avgLoad: Math.round(avgLoad * 100) / 100,
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      avgReliability: Math.round(avgReliability * 100) / 100,
      networkHealth: Math.round((healthyCount / nodes.length) * 100),
    },
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Dijkstra shortest-path routing + distance-based latency model — computed locally",
  };
}

export function computeRoute(fromId: string, toId: string, now: number = Date.now()) {
  const { nodes, edges } = buildTopology(now);
  const result = dijkstra(nodes, edges, fromId, toId);

  return {
    ...result,
    hops: result.path.length - 1,
    nodesTraversed: result.path.map(id => nodes.find(n => n.id === id)?.name || id),
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Dijkstra optimal routing — computed locally",
  };
}

export function computeSwarmStatus(now: number = Date.now()) {
  const { nodes, edges, stats } = computeNetworkTopology(now);

  const systemMemory = os.totalmem();
  const freeMemory = os.freemem();
  const uptimeSeconds = os.uptime();

  return {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      status: n.status,
      load: n.load,
      connections: n.connections.length,
      region: n.region,
    })),
    routing: {
      algorithm: "Dijkstra shortest-path",
      totalEdges: edges.length,
      avgLatencyMs: stats.avgLatencyMs,
      avgReliability: stats.avgReliability,
    },
    system: {
      totalMemoryMB: Math.round(systemMemory / 1048576),
      freeMemoryMB: Math.round(freeMemory / 1048576),
      memoryUsagePercent: Math.round((1 - freeMemory / systemMemory) * 10000) / 100,
      uptimeHours: Math.round(uptimeSeconds / 36) / 100,
      cpus: os.cpus().length,
      platform: os.platform(),
      arch: os.arch(),
    },
    networkHealth: stats.networkHealth,
    sovereignty: 100,
    computedAt: new Date(now).toISOString(),
    method: "Real system metrics + graph-based routing topology — computed locally",
  };
}
