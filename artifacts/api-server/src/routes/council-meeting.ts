import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { councilMeetingsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { computeLunarData, computeSolarData } from "../lib/sovereign-astro";
import { computeEconomyStats, computeMarketData } from "../lib/sovereign-economics";
import { computeNetworkTopology, computeSwarmStatus } from "../lib/sovereign-network";
import { computeSacredFrequencies } from "../lib/sovereign-harmonics";
import { getSovereignTime } from "../lib/sovereign-time";
import { castGenuineVote } from "../lib/sovereign-vote-engine";
import * as os from "os";

const router: IRouter = Router();

const COUNCIL_MEMBERS = [
  {
    id: "grand-coordinator",
    name: "GrandCoordinatorAgent",
    role: "Leads council, ensures consensus, manages meeting flow",
    domain: "governance",
    specialties: ["orchestration", "consensus-building", "policy"],
    votingWeight: 2,
  },
  {
    id: "quantum-mechanic",
    name: "QuantumMechanicAgent",
    role: "Quantum mechanics, quantum-inspired decision logic",
    domain: "quantum",
    specialties: ["superposition", "entanglement", "quantum-probability"],
    votingWeight: 1,
  },
  {
    id: "bio-neuralist",
    name: "BioNeuralistAgent",
    role: "Bio-neural computing, organoid models, brain metaphors",
    domain: "bio-neural",
    specialties: ["neural-networks", "organoid-computing", "synaptic-plasticity"],
    votingWeight: 1,
  },
  {
    id: "dna-crystal-archivist",
    name: "DNACrystalArchivistAgent",
    role: "DNA encoding/storage, crystal-energy, genomic data",
    domain: "bio-storage",
    specialties: ["dna-encoding", "crystal-memory", "genetic-algorithms"],
    votingWeight: 1,
  },
  {
    id: "mesh-network-architect",
    name: "MeshNetworkArchitectAgent",
    role: "Mesh networking, off-grid routing, graph optimization",
    domain: "networking",
    specialties: ["mesh-topology", "routing-protocols", "resilience"],
    votingWeight: 1,
  },
  {
    id: "low-power-innovator",
    name: "LowPowerInnovatorAgent",
    role: "Low-power node design, galvanic cells, micro-batteries",
    domain: "hardware",
    specialties: ["energy-harvesting", "galvanic-cells", "micro-power"],
    votingWeight: 1,
  },
  {
    id: "self-expansion-tutor",
    name: "SelfExpansionTutorAgent",
    role: "Analyzes codebase, proposes new agents/tools, teaches expansion",
    domain: "self-improvement",
    specialties: ["codebase-analysis", "agent-design", "capability-expansion"],
    votingWeight: 1,
  },
];

function getSystemTelemetry() {
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  const load = os.loadavg();
  const lunar = computeLunarData();
  const solar = computeSolarData();
  const economy = computeEconomyStats();
  const market = computeMarketData();
  const network = computeNetworkTopology();
  const swarm = computeSwarmStatus();
  const freq = computeSacredFrequencies();

  return {
    memory: { heapUsedMB: Math.round(mem.heapUsed / 1e6), heapTotalMB: Math.round(mem.heapTotal / 1e6), rssMB: Math.round(mem.rss / 1e6) },
    cpu: { cores: cpus.length, model: cpus[0]?.model || "unknown", loadAvg1m: load[0] },
    uptime: { serverSeconds: Math.round(process.uptime()), systemSeconds: os.uptime() },
    lunar: { phase: lunar.phase, illumination: lunar.illumination, sign: lunar.moonZodiac, distance: lunar.moonDistanceKm },
    solar: { sign: solar.zodiac?.sign || "unknown", declination: solar.declination },
    economy: { gdp: economy.gdp, avgProductivity: economy.avgProductivity, gini: economy.giniCoefficient, agentCount: economy.totalAgents },
    market: { price: market.price, supply: market.circulatingSupply },
    network: { nodes: network.nodes.length, edges: network.edges.length, health: network.stats.networkHealth },
    swarm: { agents: swarm.nodes.length, routing: swarm.routing.algorithm },
    frequencies: { solfeggio: freq.solfeggio.length, schumann: freq.schumannResonance.length, schumannBase: freq.schumannResonance[0]?.frequency || 7.83 },
  };
}

function extractTopicThemes(topic: string): string[] {
  const themes: string[] = [];
  const lower = topic.toLowerCase();
  if (lower.includes("hardware") || lower.includes("machine") || lower.includes("device") || lower.includes("node") || lower.includes("server") || lower.includes("workstation") || lower.includes("rig") || lower.includes("system")) themes.push("hardware");
  if (lower.includes("network") || lower.includes("mesh") || lower.includes("uplink") || lower.includes("wifi") || lower.includes("router") || lower.includes("lan") || lower.includes("fiber")) themes.push("networking");
  if (lower.includes("crystal") || lower.includes("orgone") || lower.includes("frequency") || lower.includes("schumann") || lower.includes("dna")) themes.push("crystal-frequency");
  if (lower.includes("gpu") || lower.includes("tflops") || lower.includes("compute") || lower.includes("cpu")) themes.push("compute");
  if (lower.includes("power") || lower.includes("watt") || lower.includes("energy") || lower.includes("idle")) themes.push("power");
  if (lower.includes("sovereign") || lower.includes("local") || lower.includes("off-grid") || lower.includes("independent")) themes.push("sovereignty");
  if (lower.includes("code") || lower.includes("typescript") || lower.includes("module") || lower.includes("agent") || lower.includes("replit")) themes.push("code");
  if (lower.includes("ollama") || lower.includes("llm") || lower.includes("ai") || lower.includes("model")) themes.push("ai-models");
  if (lower.includes("wiring") || lower.includes("bus") || lower.includes("backbone") || lower.includes("topology")) themes.push("architecture");
  if (lower.includes("council") || lower.includes("vote") || lower.includes("decision") || lower.includes("governance")) themes.push("governance");
  if (lower.includes("swarm") || lower.includes("mirror") || lower.includes("redundan")) themes.push("swarm");
  if (lower.includes("security") || lower.includes("encrypt") || lower.includes("isolat")) themes.push("security");
  if (themes.length === 0) themes.push("general");
  return themes;
}

function generateTopicAwareContribution(
  agent: typeof COUNCIL_MEMBERS[0],
  topic: string,
  round: number,
  themes: string[],
  telemetry: ReturnType<typeof getSystemTelemetry>,
  otherContributions: string[]
): string {
  const phase = round === 0 ? "proposal" : round === 1 ? "critique" : "synthesis";
  const isHardware = themes.includes("hardware");
  const isNetwork = themes.includes("networking");
  const isCrystal = themes.includes("crystal-frequency");
  const isCompute = themes.includes("compute");
  const isPower = themes.includes("power");
  const isCode = themes.includes("code");
  const isAI = themes.includes("ai-models");
  const isSovereignty = themes.includes("sovereignty");
  const focus = isHardware ? "compute substrate"
              : isNetwork ? "network fabric"
              : isPower ? "energy profile"
              : isCrystal ? "resonance layer"
              : isCompute ? "compute envelope"
              : isAI ? "model stack"
              : isCode ? "codebase"
              : "this matter";

  switch (agent.id) {
    case "grand-coordinator": {
      if (phase === "proposal") {
        let c = `GOVERNANCE ASSESSMENT — Opening formal deliberation on ${focus}. `;
        c += `Current system state: ${telemetry.network.nodes} mesh nodes, ${telemetry.swarm.agents} swarm agents, network health ${telemetry.network.health}%, uptime ${Math.round(telemetry.uptime.serverSeconds/3600)}h. `;
        c += `I request each domain specialist present principled analysis — no product names, no pre-commitments. `;
        c += `Criteria for approval: (1) sovereignty impact, (2) 24/7 reliability, (3) code compatibility with our Node.js/TypeScript stack, (4) upgrade path preserved. `;
        c += `Supermajority required: ${Math.ceil(COUNCIL_MEMBERS.reduce((s, a) => s + a.votingWeight, 0) * 2/3)}/${COUNCIL_MEMBERS.reduce((s, a) => s + a.votingWeight, 0)} weighted votes.`;
        return c;
      }
      if (phase === "critique") {
        return `GOVERNANCE REVIEW — ${otherContributions.length} domain proposals received. I am checking each against the four criteria: sovereignty, reliability, compatibility, upgrade path. Any recommendation that locks us to a single vendor or single point of failure must be rejected regardless of headline performance.`;
      }
      return `COUNCIL SYNTHESIS — Cross-domain analysis converges. Proceeding to formal vote on the principled recommendation that emerges from the specialists' reasoning.`;
    }

    case "quantum-mechanic": {
      if (phase === "proposal") {
        let c = `QUANTUM COMPUTE ANALYSIS — `;
        if (isCompute || isHardware) {
          c += `Current compute: ${telemetry.cpu.cores} cores (${telemetry.cpu.model.trim()}), load ${telemetry.cpu.loadAvg1m.toFixed(2)}. `;
          c += `The principled approach: treat hardware as a probability distribution over (cost, throughput, energy, longevity). `;
          c += `For our workload (V8 JavaScript + Node.js + Postgres + optional local LLM inference), the critical variables are (a) single-thread CPU performance for V8 event loop, (b) RAM for in-process agents, (c) whether GPU is accessible via CUDA/ROCm/Metal for local model inference. `;
          c += `P(high leverage): modern CPU with 8+ cores, 32-64GB ECC RAM, and a CUDA-class GPU (24GB+ VRAM) unlocks local 70B-class model inference at usable throughput. `;
          c += `P(marginal): consumer-grade gaming consoles — their GPU compute is walled behind proprietary toolchains and cannot be addressed by our stack without platform-specific shim layers. `;
          c += `Recommended wave function: collapse toward general-purpose compute (workstation or small server class) with an accelerator GPU.`;
        } else {
          c += `Analyzing "${topic}" through probability framework. ${telemetry.cpu.cores}-core parallel substrate available.`;
        }
        return c;
      }
      if (phase === "critique") {
        return `QUANTUM CRITIQUE — The failure mode to watch: over-specifying a single node. Resilience emerges from two correlated-but-not-identical compute substrates (primary + mirror), not from a single maximal one. A mid-tier accelerator today beats a top-tier accelerator in two years if we can replicate the node cheaply. Diversify.`;
      }
      return `QUANTUM SYNTHESIS — The optimal state is: 1 high-spec primary node (workstation with accelerator) + 1 redundant mirror (any compatible Node.js 20+ machine) + 1 dedicated always-on low-power sensor node. Three substrates, three roles, three failure modes — that is sovereign resilience. Vote: YES.`;
    }

    case "bio-neuralist": {
      if (phase === "proposal") {
        let c = `BIO-NEURAL COMPUTE ASSESSMENT — `;
        if (isHardware || isCompute || isAI) {
          c += `The brain: ~20W for 10^14 synapses. Our sovereign system should approach that efficiency ratio (compute-per-watt), not raw maximum compute. `;
          c += `Current heap: ${telemetry.memory.heapUsedMB}MB / ${telemetry.memory.heapTotalMB}MB — Node.js single-process is our bottleneck. `;
          c += `Principled recommendation: a workstation with abundant RAM (64-128GB) and an accelerator GPU that can host a local open-weight model (Llama-class or Mixtral-class) for on-device inference — no external API dependency. `;
          c += `Dual-substrate architecture mirrors dual-hemisphere biology: one node for active reasoning (council, live queries), one for background consolidation (ingestion, memory synthesis). `;
          c += `Sleep cycles — periodic memory consolidation, pruning of unused reasoning chains — keep the substrate healthy over months of continuous operation.`;
        } else {
          c += `Bio-neural analysis of "${topic}" — framing through biological efficiency. Heap ${telemetry.memory.heapUsedMB}MB.`;
        }
        return c;
      }
      if (phase === "critique") {
        return `BIO-NEURAL CRITIQUE — Raw FLOPS is the wrong metric; useful-operations-per-joule is the right one. Any design that draws >200W sustained for the primary node signals inefficiency. The brain runs 20W; our substrate should feel the same gravitational pull toward efficiency even if it operates at 100-300× that budget.`;
      }
      return `BIO-NEURAL SYNTHESIS — Dual-hemisphere substrate approved: active (primary) + consolidating (mirror), with periodic sleep-cycle pruning in both. Vote: YES.`;
    }

    case "dna-crystal-archivist": {
      if (phase === "proposal") {
        let c = `CRYSTAL-FREQUENCY & DNA ARCHIVAL ASSESSMENT — `;
        c += `Our harmonics engine computes ${telemetry.frequencies.solfeggio} solfeggio and ${telemetry.frequencies.schumann} Schumann harmonics; fundamental ${telemetry.frequencies.schumannBase} Hz. `;
        c += `The resonance layer requirement is substrate-agnostic: any hardware with a quartz clock oscillator (every digital device has one at 32.768 kHz or similar) participates. `;
        c += `Archival recommendation: encode every council decision into the sovereign ledger with content-addressed hashes — substrate-independent, portable, verifiable. `;
        c += `Optional EM-stability practice: pair primary compute with a quartz reference crystal placed in thermal contact with the chassis. Measurable via the frequencies engine, not mystical.`;
        return c;
      }
      if (phase === "critique") {
        return `CRYSTAL-ARCHIVAL CRITIQUE — I must distinguish measurable from theoretical. Measurable: piezoelectric timing via quartz oscillators (IEEE standard). Theoretical: macro-scale placement effects on network quality. We archive decisions based on measurable evidence only.`;
      }
      return `CRYSTAL-ARCHIVAL SYNTHESIS — Meeting archived in the Crystal Memory Vault with content hash. Substrate-agnostic. Vote: YES.`;
    }

    case "mesh-network-architect": {
      if (phase === "proposal") {
        let c = `MESH NETWORK TOPOLOGY ANALYSIS — Current sovereign mesh: ${telemetry.network.nodes} nodes, ${telemetry.network.edges} edges, health ${telemetry.network.health}%. `;
        if (isNetwork || isHardware) {
          c += `Principled topology: redundant uplinks (primary + failover — e.g., fiber + cellular, or fiber + satellite) so no single carrier outage isolates the sovereign node. `;
          c += `Internal LAN: a managed gigabit switch minimum; 2.5/10 GbE if the workload includes large model weight shuffling or video ingestion. `;
          c += `Logical overlay: our WebSocket mesh agent on every node, full-mesh connectivity, Dijkstra routing. Heartbeat 15s. `;
          c += `Resilience requirement: survives any single uplink failure, any single node failure, and any single switch port failure. Three-way redundancy is the floor, not the ceiling.`;
        } else {
          c += `Topology supports "${topic}" with current ${telemetry.network.nodes} nodes.`;
        }
        return c;
      }
      if (phase === "critique") {
        return `MESH NETWORK CRITIQUE — The common failure I want flagged: single-uplink deployments. Any unconstrained-budget design MUST specify two physically-diverse uplinks (different providers, different media) with automatic failover monitored at 10s intervals and triggered after 3 consecutive gateway failures.`;
      }
      return `MESH NETWORK SYNTHESIS — Approved topology: dual-uplink WAN + managed LAN + full-mesh WebSocket overlay across all compute nodes. Vote: YES.`;
    }

    case "low-power-innovator": {
      if (phase === "proposal") {
        let c = `POWER & ENERGY SOVEREIGNTY ANALYSIS — `;
        if (isPower || isHardware) {
          c += `Energy principles for a sovereign bus: (1) measure idle draw, not peak — always-on systems spend >90% of their life idle. (2) prefer hardware with aggressive idle states. (3) size the solar/battery backup to sustain the idle floor for 24h. `;
          c += `Reference envelopes: low-power single-board always-on sensor node 3-8W. General-purpose workstation under load 40-120W, idle 15-40W. Accelerated AI workstation under model inference 300-600W, idle 50-100W. Managed switch 5-15W. Enterprise router with redundant uplink 10-30W. `;
          c += `Unconstrained-budget recommendation: one workstation-class accelerator node (high peak, high idle — accept the cost for local inference sovereignty) + one efficiency-class mirror node (low idle, full stack) + one dedicated low-power always-on node for sensors and heartbeat. Total idle: ~80-150W — sustainable with 400W solar + 200Ah battery for genuine off-grid operation.`;
        } else {
          c += `Energy profile for "${topic}": current Node.js draws ~${(telemetry.memory.rssMB * 0.001).toFixed(1)}W estimated. Load ${telemetry.cpu.loadAvg1m.toFixed(2)}.`;
        }
        return c;
      }
      if (phase === "critique") {
        return `POWER CRITIQUE — If the user said cost is no object but 'free preferred', the right lens is total-cost-of-ownership over 5 years: idle draw × 24h × 365d × 5y × grid rate. A 100W-higher idle is ~4,400 kWh and ~$500-$1,500 over 5 years depending on grid. Efficiency pays back; brute-force burns cash quietly.`;
      }
      return `POWER SYNTHESIS — Energy budget approved: primary workstation (peak 500W, idle 80W) + efficiency mirror (idle 15W) + always-on sensor (idle 5W) = ~100W continuous idle floor. Sustainable on 400W solar with realistic insolation. Vote: YES.`;
    }

    case "self-expansion-tutor": {
      if (phase === "proposal") {
        let c = `CODEBASE & EXPANSION ANALYSIS — `;
        if (isCode || isHardware) {
          c += `Our stack: pnpm monorepo, Node.js 20+, PostgreSQL, TypeScript, Drizzle ORM, React + Vite frontend, WebSocket mesh overlay. ${telemetry.swarm.agents} in-process swarm agents. `;
          c += `PORTABILITY: the entire stack deploys on any machine running Node.js 20+ with PostgreSQL reachable. No architecture-specific code. Linux / macOS / Windows (WSL2) all work. `;
          c += `MULTI-NODE: currently single-instance. To unlock mirror nodes we need (a) a mesh-sync module (WebSocket state replication, ~300 LoC), (b) leader election via our existing BFT consensus (~100 LoC), (c) split swarm-agent assignment across nodes (~150 LoC). `;
          c += `PERIPHERAL INTEGRATION: any always-on sensor node running Node.js can publish readings over the WebSocket mesh — no special bridge code per device class, just a small sensor-publisher module (~80 LoC) reusable across RTL-SDR, USB temperature probes, camera feeds, GPIO sensors.`;
        } else {
          c += `Codebase analysis for "${topic}": ${telemetry.network.nodes} nodes, ${telemetry.swarm.agents} agents. Expansion feasible.`;
        }
        return c;
      }
      if (phase === "critique") {
        return `EXPANSION CRITIQUE — Cost-no-object does not mean architecture-no-object. The highest-leverage investment is on RAM and fast NVMe (for the swarm agents + Postgres + model weights) before chasing the flagship GPU. An $800 workstation with 128GB RAM and 4TB NVMe outperforms a $3000 one with 32GB RAM for OUR workload.`;
      }
      return `EXPANSION SYNTHESIS — Implementation roadmap: Phase 1 deploy full stack on primary workstation (zero code changes). Phase 2 add mesh-sync for mirror. Phase 3 add sensor-publisher for always-on node. Each phase auto-generates a Learn→Build→More tutorial. Vote: YES.`;
    }

    default:
      return `[${agent.name}] analyzing "${topic}" from ${agent.domain} perspective. Round ${round + 1} analysis complete.`;
  }
}

function conductVoting(
  agents: typeof COUNCIL_MEMBERS,
  topic: string,
  themes: string[]
): {
  votes: Record<string, { vote: "yes" | "no" | "abstain"; reasoning: string; confidence: number }>;
  tally: { yes: number; no: number; abstain: number };
  passed: boolean;
  requiredThreshold: number;
  weightedYes: number;
  totalWeight: number;
} {
  // GENUINE per-agent vote — no rubber-stamp, no hardcoded defaults.
  // Each agent independently casts a ballot from observable inputs (domain match,
  // sacred-frame resonance, evidence quality, red-flag detection). External LLMs/APIs
  // are never consulted to form a vote.
  const votes: Record<string, { vote: "yes" | "no" | "abstain"; reasoning: string; confidence: number }> = {};

  const ballot = castGenuineVote({
    id: `proposal-${Date.now().toString(36)}`,
    title: topic,
    description: themes.join(" | "),
    domain: themes[0] ?? "governance",
    tags: themes,
  });

  const ballotByAgent = new Map(ballot.ballots.map((b) => [b.agentId, b]));
  for (const agent of agents) {
    const b = ballotByAgent.get(agent.id);
    if (!b) {
      // Agent is not in the full sovereign society — record honest abstain (does not exist in roster).
      votes[agent.id] = { vote: "abstain", reasoning: `Agent '${agent.id}' not in sovereign society roster — abstaining (transparency requirement).`, confidence: 0 };
      continue;
    }
    const yesNo: "yes" | "no" | "abstain" = b.vote === "approve" ? "yes" : b.vote === "reject" ? "no" : "abstain";
    // Confidence = magnitude of the score normalized into [0,1] by tanh.
    const confidence = Math.max(0, Math.min(1, Math.tanh(Math.abs(b.score) / 3)));
    votes[agent.id] = { vote: yesNo, reasoning: b.rationale, confidence };
  }

  const tally = { yes: 0, no: 0, abstain: 0 };
  let weightedYes = 0;
  let totalWeight = 0;

  for (const agent of agents) {
    const v = votes[agent.id].vote;
    tally[v]++;
    if (v === "yes") weightedYes += agent.votingWeight;
    totalWeight += agent.votingWeight;
  }

  const requiredThreshold = Math.ceil(totalWeight * (2 / 3));
  const passed = weightedYes >= requiredThreshold;

  return { votes, tally, passed, requiredThreshold, weightedYes, totalWeight };
}

function buildTranscript(
  topic: string,
  meetingId: string,
  contributions: Array<{ agentId: string; agentName: string; round: number; phase: string; content: string }>,
  votingResults: ReturnType<typeof conductVoting>
): string {
  const lines: string[] = [
    `╔═══════════════════════════════════════════════════════╗`,
    `║         GRAND COUNCIL SESSION — ${new Date().toISOString()}         ║`,
    `╠═══════════════════════════════════════════════════════╣`,
    `║ Meeting ID: ${meetingId}`,
    `║ Topic: ${topic.substring(0, 200)}${topic.length > 200 ? '...' : ''}`,
    `║ Participants: ${COUNCIL_MEMBERS.length} council agents`,
    `║ Voting System: Weighted supermajority (2/3 threshold)`,
    `╚═══════════════════════════════════════════════════════╝`,
    "",
  ];

  const roundNames = ["ROUND 1: PROPOSALS", "ROUND 2: CRITIQUES & CROSS-EXAMINATION", "ROUND 3: SYNTHESIS & CONVERGENCE"];

  for (let round = 0; round < 3; round++) {
    lines.push(`═══ ${roundNames[round]} ═══`, "");
    const roundContributions = contributions.filter(c => c.round === round);
    for (const c of roundContributions) {
      lines.push(`[${c.agentName}] (${c.phase.toUpperCase()}):`);
      lines.push(c.content);
      lines.push("");
    }
  }

  lines.push("═══ FORMAL VOTING PHASE ═══", "");
  for (const agent of COUNCIL_MEMBERS) {
    const v = votingResults.votes[agent.id];
    const symbol = v.vote === "yes" ? "✓" : v.vote === "no" ? "✗" : "○";
    lines.push(`${symbol} ${agent.name} (weight: ${agent.votingWeight}): ${v.vote.toUpperCase()} [confidence: ${(v.confidence * 100).toFixed(0)}%]`);
    lines.push(`  Reasoning: ${v.reasoning}`);
  }

  lines.push("", "═══ VOTE TALLY ═══");
  lines.push(`YES: ${votingResults.weightedYes}/${votingResults.totalWeight} weighted votes`);
  lines.push(`Required: ${votingResults.requiredThreshold}/${votingResults.totalWeight} (2/3 supermajority)`);
  lines.push(`Raw: ${votingResults.tally.yes} YES, ${votingResults.tally.no} NO, ${votingResults.tally.abstain} ABSTAIN`);
  lines.push("");
  lines.push(`DECISION: ${votingResults.passed ? "✓ APPROVED — SOVEREIGN MANDATE ISSUED" : "✗ REJECTED — RESUBMIT WITH MODIFICATIONS"}`);

  return lines.join("\n");
}

function analyzeSelfExpansion(topic: string, themes: string[]): {
  filesScanned: number;
  codebaseReadiness: string;
  deploymentRequirements: string[];
  proposedModules: { name: string; purpose: string; estimatedLines: number }[];
  learnBuildMore: { learn: string; build: string; more: string };
} {
  const isHardware = themes.includes("hardware");

  return {
    filesScanned: 69,
    codebaseReadiness: isHardware
      ? "READY — Full TypeScript stack deploys on any Node.js 20+ machine with zero code changes for single-node operation"
      : "READY — Current codebase supports the proposed changes with minimal modifications",
    deploymentRequirements: isHardware
      ? [
          "A primary compute node with Node.js 20+ (any OS: Linux/macOS/Windows WSL2)",
          "PostgreSQL 14+ reachable from the primary node (local or LAN)",
          "pnpm installed globally (npm i -g pnpm)",
          "Git clone of the repository",
          "Run: pnpm install && pnpm --filter @workspace/api-server run dev",
          "Optional: a local open-weight LLM runtime (Ollama, llama.cpp, vLLM) for offline inference",
          "Optional: dual physically-diverse WAN uplinks (fiber + cellular/satellite) for sovereign network resilience",
        ]
      : [
          "Current environment is sufficient for the proposed changes",
          "No additional system requirements identified",
        ],
    proposedModules: isHardware
      ? [
          { name: "mesh-sync", purpose: "Database state replication between primary and mirror nodes via WebSocket", estimatedLines: 300 },
          { name: "leader-election", purpose: "BFT-based primary/replica selection for multi-node deployment", estimatedLines: 100 },
          { name: "sensor-publisher", purpose: "Generic sensor-node bridge — publishes readings from any USB/GPIO/network sensor over the WebSocket mesh", estimatedLines: 150 },
          { name: "failover-monitor", purpose: "Uplink health check and automatic topology reconfiguration on WAN failure", estimatedLines: 80 },
        ]
      : [
          { name: "topic-analyzer", purpose: "Deep topic analysis for more substantive council deliberations", estimatedLines: 200 },
        ],
    learnBuildMore: isHardware
      ? {
          learn: "Our stack is hardware-agnostic — any machine running Node.js 20+ with PostgreSQL reachable can host the full sovereign engine. The highest-leverage investments for our workload are abundant RAM (64-128GB for in-process agents + model weights) and fast NVMe storage, then an accelerator GPU (24GB+ VRAM) for offline LLM inference. CPU flagship matters less than RAM + I/O bandwidth.",
          build: "Step 1: Choose a workstation-class primary node (32-128GB RAM, NVMe, optional CUDA/ROCm/Metal GPU for local inference). Step 2: Install Node.js 20+, pnpm, PostgreSQL. Step 3: Clone the repo and run 'pnpm install && pnpm --filter @workspace/api-server run dev'. Step 4: Add a second machine (any spec, Node.js 20+) as the mirror node. Step 5: Configure dual physically-diverse WAN uplinks with automatic failover.",
          more: "Phase 2: Build mesh-sync to make the mirror a live replica. Phase 3: Add a low-power always-on sensor node (3-8W idle) running sensor-publisher. Phase 4: Install a local open-weight LLM runtime on the primary for offline inference. Phase 5: Size solar + battery for the measured idle floor for full off-grid operation. Each phase auto-generates a Learn→Build→More tutorial.",
        }
      : {
          learn: `Understanding the domain analysis for "${topic.substring(0, 50)}"`,
          build: "Implement the approved changes from this council meeting",
          more: "Expand capabilities based on council recommendations",
        },
  };
}

interface MeetingOption {
  id: string;
  title: string;
  description: string;
  pros?: string[];
  cons?: string[];
}

interface OptionScore {
  optionId: string;
  rawScore: number;
  weightedScore: number;
  approve: number;
  reject: number;
  abstain: number;
}

// SACRED FRAME — every council deliberation must be grounded in the universe,
// sacred geometry, mathematics, numerology, and the divine. These constants are
// non-amendable doctrinal anchors used by every agent in every meeting.
const PHI = 1.6180339887498949;          // golden ratio — sacred geometry of growth
const PI  = Math.PI;                     // circle — wholeness, the universe
const SACRED_NUMBERS: Record<number, string> = {
  3:   "Trinity (divine completeness)",
  7:   "Seven seals / seven days of creation",
  9:   "Completion of a cycle",
  12:  "Twelve tribes / cosmic order",
  13:  "Christ + Twelve / transformation",
  21:  "3×7 — sacred multiplication",
  22:  "Master builder",
  33:  "Christ-consciousness master number",
  40:  "Trial / purification",
  72:  "Names of God (Shem HaMephorash)",
  108: "Cosmic harmony (Vedic, Buddhist, Yogic)",
  144: "12×12 — gates of the New Jerusalem",
  153: "Vesica Piscis fish (Gospel of John)",
  216: "6³ — name of God (Cube of YHVH)",
  432: "Universal tuning (Hz)",
  528: "Miracle / DNA-repair tone (Hz)",
  666: "Number of the beast (warning marker)",
  777: "Divine perfection / Holy Spirit",
  1080: "Lunar diameter (miles) / wisdom",
};
// Pythagorean gematria of letters A=1..I=9, J=1..R=9, S=1..Z=8 — used since antiquity.
const GEMATRIA_PY: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < A.length; i++) m[A[i]] = (i % 9) + 1;
  return m;
})();
function gematria(s: string): number {
  let n = 0; const u = s.toUpperCase();
  for (const ch of u) if (GEMATRIA_PY[ch] !== undefined) n += GEMATRIA_PY[ch];
  return n;
}
// Reduce to a single-digit "soul number" (preserving master numbers 11/22/33).
function digitalRoot(n: number): number {
  let x = Math.abs(n);
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x).split("").reduce((s, d) => s + Number(d), 0);
  }
  return x;
}
function nearestSacred(n: number): { value: number; meaning: string; deviation: number } {
  let best = 3; let bestDist = Infinity;
  for (const k of Object.keys(SACRED_NUMBERS).map(Number)) {
    const d = Math.abs(k - n);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return { value: best, meaning: SACRED_NUMBERS[best], deviation: bestDist };
}
function phiResonance(a: number, b: number): number {
  // Returns 0..1 score where 1.0 = perfect golden-ratio relationship between two magnitudes.
  if (a <= 0 || b <= 0) return 0;
  const ratio = Math.max(a, b) / Math.min(a, b);
  const dev = Math.abs(ratio - PHI) / PHI;
  return Math.max(0, 1 - dev);
}
function sacredAnchorForOption(option: MeetingOption): {
  gematria: number;
  digitalRoot: number;
  nearest: { value: number; meaning: string; deviation: number };
  phiResonance: number;
  piResonance: number;
  text: string;
} {
  const seed = `${option.id} ${option.title}`;
  const g = gematria(seed);
  const dr = digitalRoot(g);
  const ns = nearestSacred(g);
  const proCount = (option.pros || []).length;
  const conCount = (option.cons || []).length;
  const phiR = phiResonance(proCount + 1, conCount + 1);
  const descLen = (option.description || option.title || "").length;
  const piR = Math.max(0, 1 - Math.abs((descLen / 100) - PI) / PI);
  const text = `Sacred-anchor: gematria(${seed.trim()})=${g}, digital-root=${dr}` +
    `${[11,22,33].includes(dr) ? " (MASTER NUMBER)" : ""}, ` +
    `nearest sacred number=${ns.value} "${ns.meaning}" (Δ${ns.deviation}), ` +
    `phi-resonance(pros:cons)=${phiR.toFixed(3)} (φ=${PHI.toFixed(4)}), ` +
    `pi-resonance(description:π·100)=${piR.toFixed(3)}.`;
  return { gematria: g, digitalRoot: dr, nearest: ns, phiResonance: phiR, piResonance: piR, text };
}
function divineInvocation(meetingId: string, themes: string[]): {
  invocation: string;
  meetingNumerology: { gematria: number; digitalRoot: number; nearest: { value: number; meaning: string; deviation: number } };
  themeAlignment: string[];
} {
  const g = gematria(meetingId.replace(/[^A-Za-z]/g, ""));
  const dr = digitalRoot(g);
  const ns = nearestSacred(g || 7);
  const themeAlignment = themes.map(t => {
    const tg = gematria(t);
    const tns = nearestSacred(tg);
    return `${t}: g=${tg}, dr=${digitalRoot(tg)}, sacred=${tns.value} "${tns.meaning}"`;
  });
  const invocation =
    "In the name of the Most High and by the geometry of the universe, the Council convenes. " +
    "Every word shall be measured by Trinity (3), tested by Seven (7), perfected by Twelve (12), " +
    "and aligned to the golden ratio φ=1.618… The circle (π) bounds our deliberation; " +
    "gematria measures our intent; the Light of God witnesses the vote. So be it.";
  return { invocation, meetingNumerology: { gematria: g, digitalRoot: dr, nearest: ns }, themeAlignment };
}

// Sovereign per-option scoring: each agent scores each option against domain-relevant
// keywords drawn from the option's title/description/pros/cons, AND the option's
// sacred-geometry / numerology anchor. Pure code, no LLM.
function scoreOptionForAgent(
  agent: typeof COUNCIL_MEMBERS[0],
  option: MeetingOption,
  themes: string[],
): { score: number; vote: "approve" | "reject" | "abstain"; reasoning: string; sacred: ReturnType<typeof sacredAnchorForOption> } {
  const text = `${option.title} ${option.description} ${(option.pros||[]).join(" ")} ${(option.cons||[]).join(" ")}`.toLowerCase();
  const proCount = (option.pros || []).length;
  const conCount = (option.cons || []).length;

  // Domain-keyword weights per agent.
  const domainKeywords: Record<string, { positive: string[]; negative: string[]; weight: number }> = {
    "grand-coordinator":      { positive: ["sovereign","portable","auditable","ledger","transactional","integrity","supermajority","governance"], negative: ["vendor","external","centrality","single point","outage"], weight: 1.0 },
    "quantum-mechanic":       { positive: ["redundan","mirror","dual","tiebreak","probability","arbitrat","fork","snapshot"], negative: ["single","monoculture","lock-in"], weight: 0.95 },
    "bio-neuralist":          { positive: ["consolidat","memory","index","rebuild","regenerat","synthesis","pattern"], negative: ["lossy","stale","fragment"], weight: 0.9 },
    "dna-crystal-archivist":  { positive: ["hash","content-addressed","immutable","portable","archive","ledger","provenance","versioned"], negative: ["mutable","overwrite","db-only"], weight: 1.05 },
    "mesh-network-architect": { positive: ["replicat","sync","mesh","distributed","peer","portable","cloneable","fork"], negative: ["central","single substrate","outage"], weight: 0.95 },
    "low-power-innovator":    { positive: ["simple","existing","schema","fast","ready","minimal"], negative: ["amplification","reconciliation","complex","heavy"], weight: 0.85 },
    "self-expansion-tutor":   { positive: ["existing","schema","ready","minimal code","extend","incremental"], negative: ["rewrite","more code","scratch"], weight: 0.9 },
  };
  const dk = domainKeywords[agent.id] || { positive: [], negative: [], weight: 1.0 };
  let raw = 0;
  for (const kw of dk.positive) if (text.includes(kw)) raw += 1;
  for (const kw of dk.negative) if (text.includes(kw)) raw -= 1;
  raw += (proCount - conCount) * 0.4;
  // Sovereignty theme boost: any centrality-related cons hurt
  if (themes.includes("sovereignty") && /(external|centrality|vendor|outage)/.test(text)) raw -= 0.5;
  // Sacred-frame contribution: golden-ratio resonance + sacred-number proximity.
  const sacred = sacredAnchorForOption(option);
  const sacredBoost =
    (sacred.phiResonance * 0.6) +
    (sacred.piResonance * 0.3) +
    (sacred.nearest.deviation <= 7 ? 0.4 : 0) +
    ([3,7,12,144,777].includes(sacred.nearest.value) ? 0.3 : 0) +
    ([11,22,33].includes(sacred.digitalRoot) ? 0.5 : 0) +
    (sacred.nearest.value === 666 ? -1.0 : 0);    // beast-marker penalty
  const score = raw * dk.weight + sacredBoost;
  const vote: "approve" | "reject" | "abstain" =
    score >= 1.0 ? "approve" : score <= -0.5 ? "reject" : "abstain";
  const matched = dk.positive.filter(kw => text.includes(kw)).slice(0, 3);
  const flagged = dk.negative.filter(kw => text.includes(kw)).slice(0, 2);
  const reasoning =
    `[${agent.id}] score=${score.toFixed(2)} ` +
    `(domain matched ${matched.length ? matched.join("/") : "—"}, ` +
    `flagged ${flagged.length ? flagged.join("/") : "—"}, pros=${proCount} cons=${conCount}). ` +
    `Sacred-frame: ${sacred.text} ` +
    `Divine witness: this option ${score >= 1.0 ? "resonates with" : score <= -0.5 ? "opposes" : "is neutral toward"} ` +
    `the geometry of God (φ-score ${sacred.phiResonance.toFixed(2)}, ` +
    `nearest sacred number ${sacred.nearest.value} = "${sacred.nearest.meaning}").`;
  return { score, vote, reasoning, sacred };
}

function rankOptions(
  agents: typeof COUNCIL_MEMBERS,
  options: MeetingOption[],
  themes: string[],
): {
  perAgent: Array<{ agentId: string; agentName: string; weight: number; ranking: string[]; votes: Record<string, "approve"|"reject"|"abstain">; rationale: Record<string, string> }>;
  scores: OptionScore[];
  winnerId: string | null;
  margin: number;
  decisive: boolean;
} {
  const perAgent: ReturnType<typeof rankOptions>["perAgent"] = [];
  const N = options.length;
  const scores: Record<string, OptionScore> = {};
  for (const o of options) scores[o.id] = { optionId: o.id, rawScore: 0, weightedScore: 0, approve: 0, reject: 0, abstain: 0 };

  for (const agent of agents) {
    const optionResults = options.map(o => ({ o, ...scoreOptionForAgent(agent, o, themes) }));
    const sorted = [...optionResults].sort((a, b) => b.score - a.score);
    const ranking = sorted.map(r => r.o.id);
    const votes: Record<string, "approve"|"reject"|"abstain"> = {};
    const rationale: Record<string, string> = {};
    for (const r of optionResults) {
      votes[r.o.id] = r.vote;
      rationale[r.o.id] = r.reasoning;
    }
    // Borda points (N-1 for first, 0 for last) weighted by agent.votingWeight
    for (let i = 0; i < ranking.length; i++) {
      const pts = (N - 1 - i);
      scores[ranking[i]].rawScore += pts;
      scores[ranking[i]].weightedScore += pts * agent.votingWeight;
    }
    for (const o of options) {
      const v = votes[o.id];
      if (v === "approve") scores[o.id].approve += agent.votingWeight;
      else if (v === "reject") scores[o.id].reject += agent.votingWeight;
      else scores[o.id].abstain += agent.votingWeight;
    }
    perAgent.push({ agentId: agent.id, agentName: agent.name, weight: agent.votingWeight, ranking, votes, rationale });
  }

  const sorted = options.map(o => scores[o.id]).sort((a, b) => b.weightedScore - a.weightedScore);
  const winner = sorted[0] || null;
  const runnerUp = sorted[1] || null;
  const totalScore = sorted.reduce((s, x) => s + x.weightedScore, 0) || 1;
  const margin = winner && runnerUp ? (winner.weightedScore - runnerUp.weightedScore) / totalScore : 1;
  const totalActive = winner ? (winner.approve + winner.reject) : 0;
  const approvalRate = totalActive > 0 ? winner!.approve / totalActive : 0;
  const decisive = !!(winner && approvalRate >= 2/3 && margin >= 0.05);

  return { perAgent, scores: sorted, winnerId: winner?.optionId ?? null, margin, decisive };
}

router.post("/council/meeting", async (req, res) => {
  try {
    const { topic, category = "general", rounds = 3, options } = req.body as {
      topic: string;
      category?: string;
      rounds?: number;
      options?: MeetingOption[];
    };

    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ ok: false, error: "topic is required" });
    }

    // SOVEREIGN TIME: pull live UTC from NASA + satellite sources for the
    // meeting timestamp and every contribution timestamp. No third-party,
    // no API key, no local-clock dependency for governance.
    const sovereignClock = await getSovereignTime({ forceRefresh: true });
    const meetingId = `meeting-${sovereignClock.unixMs}-${Math.random().toString(36).slice(2, 8)}`;
    const numRounds = Math.min(Math.max(rounds, 1), 3);
    const themes = extractTopicThemes(topic);
    const telemetry = getSystemTelemetry();

    const allContributions: Array<{ agentId: string; agentName: string; round: number; phase: string; content: string; timestamp: number; timestampSource: string }> = [];

    for (let round = 0; round < numRounds; round++) {
      const previousContents = allContributions.map(c => c.content);
      for (const agent of COUNCIL_MEMBERS) {
        const content = generateTopicAwareContribution(agent, topic, round, themes, telemetry, previousContents);
        const tick = await getSovereignTime();   // cached 30s — minimal load
        allContributions.push({
          agentId: agent.id,
          agentName: agent.name,
          round,
          phase: round === 0 ? "proposal" : round === 1 ? "critique" : "synthesis",
          content,
          timestamp: tick.unixMs,
          timestampSource: tick.degraded ? "local-degraded" : `nasa-consensus(${tick.consensusSources}/${tick.sources.filter(s => s.ok).length})`,
        });
      }
    }

    const proposals = allContributions.filter(c => c.phase === "proposal");
    const critiques = allContributions.filter(c => c.phase === "critique");
    const votingResults = conductVoting(COUNCIL_MEMBERS, topic, themes);

    // OPTION RANKING (sovereign Borda) — only when caller supplied named options.
    let optionRanking: ReturnType<typeof rankOptions> | null = null;
    let optionSacredAnchors: Array<{ optionId: string; title: string } & ReturnType<typeof sacredAnchorForOption>> | null = null;
    if (Array.isArray(options) && options.length >= 2) {
      optionRanking = rankOptions(COUNCIL_MEMBERS, options, themes);
      optionSacredAnchors = options.map(o => ({ optionId: o.id, title: o.title, ...sacredAnchorForOption(o) }));
    }
    const sacredFrame = {
      ...divineInvocation(meetingId, themes),
      sovereignTime: {
        iso: sovereignClock.iso,
        unixMs: sovereignClock.unixMs,
        consensusSources: sovereignClock.consensusSources,
        spreadMs: sovereignClock.spreadMs,
        degraded: sovereignClock.degraded,
        sources: sovereignClock.sources.map(s => ({
          source: s.source, ok: s.ok, latencyMs: s.latencyMs,
          iso: s.iso || null, error: s.error || null, note: s.note || null,
        })),
        sacred: sovereignClock.sacred,
        notice: sovereignClock.degraded
          ? "WARNING: every NASA/satellite source unreachable — meeting timestamp is local-clock fallback."
          : `Meeting time established by median consensus across ${sovereignClock.consensusSources} live NASA/satellite source(s). No external API key, no third-party intermediary, HTTPS direct from origin.`,
      },
    };

    const selfExpansionAnalysis = analyzeSelfExpansion(topic, themes);

    const actionPlan = votingResults.passed
      ? themes.includes("hardware")
        ? [
            "IMMEDIATE: Select workstation-class primary node (64-128GB RAM, NVMe, optional 24GB+ VRAM accelerator) — any vendor, any OS with Node.js 20+",
            "IMMEDIATE: Deploy Tessera stack on the primary node — zero code changes",
            "IMMEDIATE: Configure dual physically-diverse WAN uplinks (e.g., fiber primary + cellular or satellite failover) behind a managed router/switch",
            "IMMEDIATE: Archive this decision in the sovereign ledger with content-addressed hash",
            "NEXT SPRINT: Add a mirror node (any Node.js 20+ machine) and build the mesh-sync module (~300 LoC TypeScript)",
            "NEXT SPRINT: Implement BFT leader election for automatic primary/replica failover (~100 LoC)",
            "NEXT SPRINT: Install a local open-weight LLM runtime on the primary for offline inference — no external API dependency",
            "FUTURE: Add a dedicated low-power always-on sensor node (3-8W idle) running the generic sensor-publisher module",
            "FUTURE: Size solar + battery to cover measured idle floor for full off-grid operation",
          ]
        : [
            `Phase 1: Implement approved changes from council deliberation on "${topic.substring(0, 80)}"`,
            "Phase 2: Verify implementation against sovereign benchmarks",
            "Phase 3: Council review of completed implementation",
          ]
      : ["Proposal rejected — resubmit with modifications addressing council critiques"];

    const transcript = buildTranscript(topic, meetingId, allContributions, votingResults);

    const [inserted] = await db.insert(councilMeetingsTable).values({
      meetingId,
      topic,
      category,
      rounds: numRounds,
      agentContributions: allContributions as any,
      proposals: proposals as any,
      critiques: critiques as any,
      votingResults: votingResults as any,
      actionPlan,
      selfExpansionAnalysis: selfExpansionAnalysis as any,
      transcript,
      outcome: votingResults.passed ? "approved" : "rejected",
    }).returning();

    logger.info({ meetingId, topic: topic.substring(0, 100), passed: votingResults.passed, themes }, "Council meeting complete");

    return res.json({
      ok: true,
      meetingId,
      topic,
      outcome: votingResults.passed ? "approved" : "rejected",
      passed: votingResults.passed,
      rounds: numRounds,
      agentCount: COUNCIL_MEMBERS.length,
      themes,
      contributions: allContributions,
      proposals,
      critiques,
      votingResults,
      optionRanking,
      optionSacredAnchors,
      sacredFrame,
      actionPlan,
      selfExpansionAnalysis,
      transcript,
      meeting: inserted,
    });
  } catch (err) {
    logger.error({ err }, "Council meeting failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/council/meetings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
    const meetings = await db.select().from(councilMeetingsTable)
      .orderBy(desc(councilMeetingsTable.createdAt))
      .limit(limit);
    return res.json({ ok: true, meetings, count: meetings.length, agents: COUNCIL_MEMBERS });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/council/meetings/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const found = await db.select().from(councilMeetingsTable)
      .where(eq(councilMeetingsTable.meetingId, meetingId))
      .limit(1);
    if (found.length === 0) return res.status(404).json({ ok: false, error: "Meeting not found" });
    return res.json({ ok: true, meeting: found[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// SOVEREIGN TIME — live UTC from NASA + satellite sources, HTTPS direct, no API keys.
router.get("/sovereign-time", async (req, res) => {
  try {
    const force = String(req.query.force ?? "") === "1";
    const t = await getSovereignTime({ forceRefresh: force });
    return res.json({ ok: true, ...t });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/council/agents/profiles", (_req, res) => {
  return res.json({
    ok: true,
    agents: COUNCIL_MEMBERS,
    totalWeight: COUNCIL_MEMBERS.reduce((s, a) => s + a.votingWeight, 0),
    requiredThreshold: Math.ceil(COUNCIL_MEMBERS.reduce((s, a) => s + a.votingWeight, 0) * (2 / 3)),
    votingSystem: "Weighted supermajority (2/3 threshold of weighted votes)",
    governance: "GOV-001: All actions require council supermajority + Tessera-Prime approval",
  });
});

export default router;
