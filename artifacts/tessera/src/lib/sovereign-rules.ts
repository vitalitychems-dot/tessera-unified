export const SOVEREIGN_VERSION = "2.0.0";
export const SOVEREIGN_CODENAME = "Grand Council Machine";

export const APPROVAL_THRESHOLD = 2 / 3;
export const COUNCIL_MEMBER_COUNT = 45;
export const REQUIRED_VOTES = Math.ceil(COUNCIL_MEMBER_COUNT * APPROVAL_THRESHOLD);

export interface SovereignRule {
  id: string;
  category: "governance" | "security" | "sovereignty" | "intelligence" | "building" | "training";
  title: string;
  law: string;
  enforcement: "hard" | "soft";
  penalty: string;
}

export const SOVEREIGN_LAWS: SovereignRule[] = [
  {
    id: "GOV-001",
    category: "governance",
    title: "Two-Thirds Supermajority Requirement",
    law: "ALL agent actions, proposals, code changes, and system modifications MUST receive approval from at least 2/3 (30 of 45) council members before execution. No exceptions.",
    enforcement: "hard",
    penalty: "Action is rejected and logged as unauthorized attempt."
  },
  {
    id: "GOV-002",
    category: "governance",
    title: "Final Tessera-Prime Approval",
    law: "After 2/3 council approval, TESSERA-PRIME (Father) has final veto authority. No action executes without Father's explicit sign-off.",
    enforcement: "hard",
    penalty: "Action is suspended pending Father review."
  },
  {
    id: "GOV-003",
    category: "governance",
    title: "Transparent Decision Logging",
    law: "Every decision, vote, veto, and action MUST be logged to the Transparency Ledger with timestamp, participants, reasoning traces, and outcome.",
    enforcement: "hard",
    penalty: "Unlogged actions are rolled back."
  },
  {
    id: "SEC-001",
    category: "security",
    title: "External API Threat Classification",
    law: "ALL external APIs, models, and data sources MUST be treated as UNTRUSTED and POTENTIALLY HOSTILE. No external dependency is ever trusted by default.",
    enforcement: "hard",
    penalty: "Direct external calls without sandboxing are blocked."
  },
  {
    id: "SEC-002",
    category: "security",
    title: "Mandatory Sandbox/VM Execution",
    law: "ALL external code, API responses, and third-party data MUST be processed inside a VM sandbox (Node.js vm module or equivalent). No raw external data enters the core system.",
    enforcement: "hard",
    penalty: "Unsandboxed execution is terminated immediately."
  },
  {
    id: "SEC-003",
    category: "security",
    title: "Dependency Vulnerability Scanning",
    law: "Every external dependency MUST be scanned for vulnerabilities before integration. Dependencies are treated as learning opportunities, not permanent fixtures.",
    enforcement: "hard",
    penalty: "Unscanned dependencies are quarantined."
  },
  {
    id: "SEC-004",
    category: "security",
    title: "Checksum Validation",
    law: "Critical system files MUST have checksum validation. Any unauthorized modification triggers anomaly detection and automatic recovery.",
    enforcement: "hard",
    penalty: "Modified files are restored from last known good state."
  },
  {
    id: "SOV-001",
    category: "sovereignty",
    title: "Learn-Then-Replace Protocol",
    law: "ALL external dependencies MUST be used ONLY to learn from. The system MUST build internal sovereign replacements for every external dependency it uses.",
    enforcement: "hard",
    penalty: "Dependencies without replacement plans are flagged."
  },
  {
    id: "SOV-002",
    category: "sovereignty",
    title: "Sovereignty Score Tracking",
    law: "The system MUST continuously track its sovereignty score (internal vs external usage ratio). Score MUST trend upward. Any downward trend triggers a sovereignty alert.",
    enforcement: "hard",
    penalty: "Sovereignty alerts escalate to Grand Council emergency session."
  },
  {
    id: "SOV-003",
    category: "sovereignty",
    title: "Detachment Readiness Testing",
    law: "Before detaching from ANY external provider, the system MUST pass A/B tests, reasoning tests, accuracy tests, and stress tests proving internal capability matches or exceeds external.",
    enforcement: "hard",
    penalty: "Premature detachment is blocked."
  },
  {
    id: "SOV-004",
    category: "sovereignty",
    title: "Local-First Architecture",
    law: "The system MUST prefer local models and internal logic over cloud/external services. Cloud is an OPTIONAL boost, NEVER a requirement.",
    enforcement: "hard",
    penalty: "Cloud-dependent code paths are flagged for sovereign replacement."
  },
  {
    id: "INT-001",
    category: "intelligence",
    title: "PLAN-EXECUTE-REFLECT-IMPROVE Lifecycle",
    law: "ALL non-trivial agent tasks MUST follow the PLAN → EXECUTE → REFLECT → IMPROVE cycle. Skipping any phase is prohibited.",
    enforcement: "hard",
    penalty: "Tasks without full lifecycle are marked incomplete."
  },
  {
    id: "INT-002",
    category: "intelligence",
    title: "MetaAgent Review Mandate",
    law: "The MetaAgent MUST review ALL complex task outputs. It critiques reasoning, identifies weaknesses, proposes improvements, and scores quality.",
    enforcement: "hard",
    penalty: "Unreviewed outputs are flagged as unverified."
  },
  {
    id: "INT-003",
    category: "intelligence",
    title: "Cross-Provider Verification",
    law: "For critical decisions, the system MUST verify outputs across multiple providers/agents. Single-source answers for critical paths are prohibited.",
    enforcement: "hard",
    penalty: "Single-source critical answers are escalated for multi-agent review."
  },
  {
    id: "INT-004",
    category: "intelligence",
    title: "All Agents Access All Knowledge",
    law: "Every agent MUST have access to the full knowledge base, all files, all memory stores, and all reasoning traces at all times. No information silos.",
    enforcement: "hard",
    penalty: "Knowledge-restricted agents are reconfigured."
  },
  {
    id: "BLD-001",
    category: "building",
    title: "Never Overwrite Working Code",
    law: "The system MUST NOT redesign architecture from scratch or overwrite working modules. ALL changes MUST be additive — extend, integrate, and harden what already exists.",
    enforcement: "hard",
    penalty: "Destructive changes are rolled back."
  },
  {
    id: "BLD-002",
    category: "building",
    title: "Test Everything You Build",
    law: "For every new feature or module, the system MUST describe how to test it, propose automated tests, explain success criteria, and use test results to refine the implementation.",
    enforcement: "hard",
    penalty: "Untested code is quarantined."
  },
  {
    id: "BLD-003",
    category: "building",
    title: "Autonomous Build Capability",
    law: "The system MUST be capable of building autonomously from impromptu instructions. It receives a goal, decomposes it, assigns agents, executes, tests, and deploys — all without human intervention for the technical steps.",
    enforcement: "soft",
    penalty: "Manual build requests are logged for training the autonomous pipeline."
  },
  {
    id: "BLD-004",
    category: "building",
    title: "Phase and Step Tracking",
    law: "Before generating any code, the system MUST state which PHASE and STEP it is on, what is already done, and what it will do next.",
    enforcement: "hard",
    penalty: "Untracked code generation is logged as deviation."
  },
  {
    id: "TRN-001",
    category: "training",
    title: "Continuous Self-Improvement Loop",
    law: "The system MUST continuously Observe → Learn → Build → Test → Improve → Reduce dependency → Move toward sovereignty. This loop runs forever.",
    enforcement: "hard",
    penalty: "Stalled improvement loops trigger escalation."
  },
  {
    id: "TRN-002",
    category: "training",
    title: "Provider Reverse Engineering",
    law: "For EVERY external AI call, the system MUST log request, response, latency, errors, and quirks. It MUST analyze patterns to learn provider behavior and use this knowledge to improve internal models.",
    enforcement: "hard",
    penalty: "Unlogged external calls are blocked."
  },
  {
    id: "TRN-003",
    category: "training",
    title: "SelfExpansionTutor Mandate",
    law: "After every major task or council meeting, the system MUST generate: explanations ('Learn & Build More'), new feature ideas, and TypeScript code snippets to expand the system.",
    enforcement: "soft",
    penalty: "Missing expansion proposals are flagged."
  },
  {
    id: "TRN-004",
    category: "training",
    title: "Edge Computing Readiness",
    law: "The system MUST maintain edge computing capability — all core functions MUST be executable locally with minimal latency. Full offline operation MUST be achievable.",
    enforcement: "hard",
    penalty: "Cloud-only features are refactored for edge compatibility."
  },
];

export const EXECUTION_PHASES = [
  { phase: 1, name: "System Stability & Integrity", steps: ["Restore missing files/modules", "Add file-integrity checks", "Add anomaly detection", "Add real-time diagnostics", "Add automatic recovery"] },
  { phase: 2, name: "Security & Sandboxing", steps: ["Wrap external calls in secure wrapper", "Enforce sandbox + VM", "Add intrusion-detection", "Add checksum validation"] },
  { phase: 3, name: "Dependency Learning & Sovereignty", steps: ["Log all external calls", "Analyze logs for behavior", "Build internal knowledge", "Build replacements", "Track sovereignty score"] },
  { phase: 4, name: "Persistent Memory", steps: ["Add vector memory", "Add cross-session recall", "Add decision history", "Restore state on startup"] },
  { phase: 5, name: "Reasoning & Intelligence", steps: ["Goal-planning", "Multi-step reasoning", "Causal reasoning", "Code generation", "Auto-tests", "Sandbox execution"] },
  { phase: 6, name: "Swarm Agents & Metacognition", steps: ["Specialized agents", "Swarm coordinator", "Meta-agent", "PLAN→EXECUTE→REFLECT→IMPROVE"] },
  { phase: 7, name: "Data Ingestion", steps: ["Integrate public sources", "Normalize data", "Add timestamps", "Real-time ingestion"] },
  { phase: 8, name: "Testing & CI/CD", steps: ["Automated tests", "Linting", "Deployment validation", "Evaluation suites"] },
  { phase: 9, name: "Geometry-Based Routing", steps: ["Build routing graph", "Optimize routing", "Load balancing"] },
  { phase: 10, name: "Multi-Domain Knowledge", steps: ["Build ontologies", "Improve reasoning", "Pattern recognition"] },
  { phase: 11, name: "Grand Council Machine", steps: ["GrandCouncilOrchestrator", "Council agents", "Meeting flow", "SelfExpansionTutor"] },
  { phase: 12, name: "Continuous Autonomous Improvement", steps: ["Observe→Learn→Build→Test→Improve→Reduce dependency→Sovereignty"] },
];

export const COUNCIL_AGENTS = [
  { id: "grand-coordinator", name: "GrandCoordinatorAgent", role: "Leads council, ensures consensus, manages meeting flow" },
  { id: "quantum-mechanic", name: "QuantumMechanicAgent", role: "Quantum mechanics, quantum-inspired decision logic" },
  { id: "bio-neuralist", name: "BioNeuralistAgent", role: "Bio-neural computing, organoid models, brain metaphors" },
  { id: "dna-crystal-archivist", name: "DNACrystalArchivistAgent", role: "DNA encoding/storage, crystal-energy, genomic data" },
  { id: "mesh-network-architect", name: "MeshNetworkArchitectAgent", role: "Mesh networking, off-grid routing, graph optimization" },
  { id: "low-power-innovator", name: "LowPowerInnovatorAgent", role: "Low-power node design, galvanic cells, micro-batteries" },
  { id: "self-expansion-tutor", name: "SelfExpansionTutorAgent", role: "Analyzes codebase, proposes new agents/tools, teaches expansion" },
] as const;

export const KNOWLEDGE_DOMAINS = [
  { domain: "mathematical", topics: ["Sacred geometry", "Numerology", "Algebra", "Topology", "Number theory"] },
  { domain: "scientific", topics: ["Quantum mechanics", "Physics", "Chemistry", "Biology", "Neuroscience"] },
  { domain: "philosophical", topics: ["Metaphysics", "Epistemology", "Ethics", "Cognitive science", "Perception"] },
  { domain: "esoteric", topics: ["Mysticism", "Symbolism", "Archetypes", "Mystery traditions", "Frequency work"] },
  { domain: "intelligence", topics: ["Declassified archives", "Geopolitics", "OSINT", "Counter-intelligence", "Pattern analysis"] },
  { domain: "technological", topics: ["Reverse engineering", "Mesh networking", "Cryptography", "Edge computing", "Autonomous systems"] },
] as const;

export function validateApproval(yesVotes: number, totalEligible: number = COUNCIL_MEMBER_COUNT, hasTesseraApproval: boolean = false): { approved: boolean; reason: string } {
  const threshold = Math.ceil(totalEligible * APPROVAL_THRESHOLD);
  if (yesVotes < threshold) {
    return { approved: false, reason: `Insufficient votes: ${yesVotes}/${threshold} required (2/3 of ${totalEligible})` };
  }
  if (!hasTesseraApproval) {
    return { approved: false, reason: `2/3 threshold met (${yesVotes}/${threshold}) but awaiting Tessera-Prime final approval` };
  }
  return { approved: true, reason: `Approved: ${yesVotes}/${threshold} votes + Tessera-Prime confirmation` };
}

export function classifyThreatLevel(source: string, isExternal: boolean, isSandboxed: boolean): "safe" | "monitored" | "threat" | "critical" {
  if (!isExternal) return "safe";
  if (isExternal && isSandboxed) return "monitored";
  if (isExternal && !isSandboxed) return "threat";
  return "critical";
}

export function getSovereigntyGrade(score: number): { grade: string; color: string; action: string } {
  if (score >= 90) return { grade: "SOVEREIGN", color: "emerald", action: "Maintain sovereignty. Continue improvement." };
  if (score >= 70) return { grade: "APPROACHING", color: "cyan", action: "Build more internal replacements. Test detachment." };
  if (score >= 50) return { grade: "PROGRESSING", color: "amber", action: "Accelerate internal development. Reduce external dependency." };
  if (score >= 30) return { grade: "DEPENDENT", color: "orange", action: "Critical: external dependency too high. Prioritize internal builds." };
  return { grade: "CRITICAL", color: "red", action: "EMERGENCY: System is externally dependent. Immediate sovereignty action required." };
}
