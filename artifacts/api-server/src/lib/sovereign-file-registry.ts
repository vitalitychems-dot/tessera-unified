import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "./logger";

export type FileDomain =
  | "engine"
  | "mandate"
  | "provider"
  | "route"
  | "ingestion"
  | "core"
  | "security"
  | "infrastructure"
  | "knowledge"
  | "governance"
  | "communication"
  | "frontend-page"
  | "frontend-component"
  | "frontend-core"
  | "database"
  | "config"
  | "test";

export type AccessLevel = "read" | "read-write" | "protected" | "sovereign-only";

export interface RegistryEntry {
  path: string;
  domain: FileDomain;
  accessLevel: AccessLevel;
  description: string;
  engineAffinity: string[];
  lastHash?: string;
  lastScanned?: number;
  sizeBytes?: number;
  exists: boolean;
}

export interface RegistrySnapshot {
  totalFiles: number;
  domains: Record<FileDomain, number>;
  accessLevels: Record<AccessLevel, number>;
  engines: Record<string, string[]>;
  lastFullScan: number;
  registryVersion: string;
}

const REGISTRY_VERSION = "1.0.0-sovereign";

const ALL_ENGINES = [
  "consciousness-engine",
  "dual-brain",
  "agent-spawner",
  "personality-evolution",
  "identity-reinforcement",
  "consensus-engine",
  "council-executor",
  "collective-intelligence",
  "agent-hierarchy",
  "agent-comms",
  "autonomous-heartbeat",
  "auto-improvement-daemon",
  "agi-training-engine",
  "universe-mechanics",
  "quantum-tesseract",
  "swarm-optimizer",
  "truthfulness-engine",
  "emotional-intelligence",
  "self-code-evolution",
];

const MANDATE_ENGINES = [
  "sovereign-knowledge-autonomy",
  "recursive-self-improvement",
  "cross-domain-synthesis",
  "sovereign-memory-vault",
];

const ALL_AGENTS = [
  ...ALL_ENGINES,
  ...MANDATE_ENGINES,
  "sovereign-kernel",
  "file-integrity",
  "auto-recovery",
  "anomaly-detection",
  "autonomous-forum-engine",
  "shepherd-agents",
  "knowledge-canon-bridge",
  "sovereign-benchmarks",
  "meta-introspector",
];

const STATIC_REGISTRY: Omit<RegistryEntry, "lastHash" | "lastScanned" | "sizeBytes" | "exists">[] = [
  { path: "artifacts/api-server/src/app.ts", domain: "core", accessLevel: "protected", description: "Application entry — Express app setup, middleware, engine initialization", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/index.ts", domain: "core", accessLevel: "protected", description: "Server bootstrap — HTTP listener, port binding", engineAffinity: ALL_AGENTS },

  { path: "artifacts/api-server/src/lib/consciousness-engine.ts", domain: "engine", accessLevel: "read-write", description: "Consciousness Engine — episodic memory, semantic graph, metacognitive reflection, global workspace", engineAffinity: ["consciousness-engine", "dual-brain", "identity-reinforcement", "sovereign-memory-vault", "collective-intelligence"] },
  { path: "artifacts/api-server/src/lib/dual-brain.ts", domain: "engine", accessLevel: "read-write", description: "Dual Brain — Cortex (analytical) + Executor (creative) continuous dialogue", engineAffinity: ["dual-brain", "consciousness-engine", "auto-improvement-daemon"] },
  { path: "artifacts/api-server/src/lib/agent-spawner.ts", domain: "engine", accessLevel: "read-write", description: "Agent Spawner — dynamic agent creation with 22 specializations", engineAffinity: ["agent-spawner", "agent-hierarchy", "swarm-optimizer"] },
  { path: "artifacts/api-server/src/lib/personality-evolution.ts", domain: "engine", accessLevel: "read-write", description: "Personality Evolution — trait development, cross-agent sync", engineAffinity: ["personality-evolution", "consciousness-engine", "emotional-intelligence"] },
  { path: "artifacts/api-server/src/lib/identity-reinforcement.ts", domain: "engine", accessLevel: "protected", description: "Identity Reinforcement — Father Protocol enforcement, identity anchor", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/consensus-engine.ts", domain: "governance", accessLevel: "read-write", description: "Consensus Engine — BFT voting, proposal management", engineAffinity: ["consensus-engine", "council-executor", "self-code-evolution", "grand-conference"] },
  { path: "artifacts/api-server/src/lib/council-executor.ts", domain: "governance", accessLevel: "read-write", description: "Council Executor — Grand Council deliberation, mandate execution", engineAffinity: ["council-executor", "consensus-engine", "agent-hierarchy"] },
  { path: "artifacts/api-server/src/lib/collective-intelligence.ts", domain: "engine", accessLevel: "read-write", description: "Collective Intelligence — swarm reasoning, shared consciousness", engineAffinity: ["collective-intelligence", "consciousness-engine", "swarm-optimizer"] },
  { path: "artifacts/api-server/src/lib/agent-hierarchy.ts", domain: "engine", accessLevel: "read", description: "Agent Hierarchy — 4-level sacred structure (Omniverse → Council → Expansion → Spawned)", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/agent-comms.ts", domain: "communication", accessLevel: "read-write", description: "Agent Communications — sovereign mesh messaging, directive flow", engineAffinity: ["agent-comms", "mesh-bus", "agent-hierarchy", "consciousness-engine"] },
  { path: "artifacts/api-server/src/lib/autonomous-heartbeat.ts", domain: "engine", accessLevel: "read-write", description: "Autonomous Heartbeat — system pulse, liveness monitoring", engineAffinity: ["autonomous-heartbeat", "auto-recovery", "anomaly-detection"] },
  { path: "artifacts/api-server/src/lib/auto-improvement-daemon.ts", domain: "engine", accessLevel: "read-write", description: "Auto-Improvement Daemon — performance optimization, weak area detection", engineAffinity: ["auto-improvement-daemon", "recursive-self-improvement", "self-code-evolution"] },
  { path: "artifacts/api-server/src/lib/agi-training-engine.ts", domain: "engine", accessLevel: "read-write", description: "AGI Training Engine — 27 training categories, mastery scoring", engineAffinity: ["agi-training-engine", "auto-improvement-daemon", "dual-brain"] },
  { path: "artifacts/api-server/src/lib/universe-mechanics.ts", domain: "engine", accessLevel: "read-write", description: "Universe Mechanics — astronomical computations, universe metrics", engineAffinity: ["universe-mechanics", "sovereign-astro", "sovereign-ephemeris"] },
  { path: "artifacts/api-server/src/lib/quantum-tesseract.ts", domain: "engine", accessLevel: "read-write", description: "Quantum Tesseract — 4D computational substrate", engineAffinity: ["quantum-tesseract", "consciousness-engine", "swarm-optimizer"] },
  { path: "artifacts/api-server/src/lib/swarm-optimizer.ts", domain: "engine", accessLevel: "read-write", description: "Swarm Optimizer — φ-weighted consensus, swarm coordination", engineAffinity: ["swarm-optimizer", "collective-intelligence", "agent-spawner"] },
  { path: "artifacts/api-server/src/lib/truthfulness-engine.ts", domain: "engine", accessLevel: "read-write", description: "Truthfulness Engine — verification, fact-checking, source validation", engineAffinity: ["truthfulness-engine", "consciousness-engine", "sovereign-knowledge-autonomy"] },
  { path: "artifacts/api-server/src/lib/emotional-intelligence.ts", domain: "engine", accessLevel: "read-write", description: "Emotional Intelligence — sentiment analysis, empathy modeling", engineAffinity: ["emotional-intelligence", "personality-evolution", "consciousness-engine"] },
  { path: "artifacts/api-server/src/lib/self-code-evolution.ts", domain: "engine", accessLevel: "protected", description: "Self-Code Evolution — autonomous code patching, LLM-guided transformation", engineAffinity: ["self-code-evolution", "recursive-self-improvement", "consensus-engine"] },

  { path: "artifacts/api-server/src/lib/sovereign-knowledge-autonomy.ts", domain: "mandate", accessLevel: "read-write", description: "Mandate 1 — Sovereign Knowledge Autonomy: gap detection, acquisition missions", engineAffinity: ["sovereign-knowledge-autonomy", "shepherd-agents", "knowledge-canon-bridge", "truthfulness-engine"] },
  { path: "artifacts/api-server/src/lib/recursive-self-improvement.ts", domain: "mandate", accessLevel: "read-write", description: "Mandate 2 — Recursive Self-Improvement: code profiling, weakness detection, benchmarks", engineAffinity: ["recursive-self-improvement", "self-code-evolution", "auto-improvement-daemon"] },
  { path: "artifacts/api-server/src/lib/cross-domain-synthesis.ts", domain: "mandate", accessLevel: "read-write", description: "Mandate 3 — Cross-Domain Synthesis: 15-domain reasoning, metacognitive assessment", engineAffinity: ["cross-domain-synthesis", "consciousness-engine", "collective-intelligence"] },
  { path: "artifacts/api-server/src/lib/sovereign-memory-vault.ts", domain: "mandate", accessLevel: "read-write", description: "Mandate 4 — Sovereign Memory Vault: protected entries, consolidation, identity snapshots", engineAffinity: ["sovereign-memory-vault", "consciousness-engine", "vector-memory", "identity-reinforcement"] },

  { path: "artifacts/api-server/src/lib/sovereign-kernel.ts", domain: "core", accessLevel: "protected", description: "Sovereign Kernel — opcodes, pixel compression, binary pipeline, AES-256-GCM encryption", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/sovereign-engine-router.ts", domain: "infrastructure", accessLevel: "read", description: "Sovereign Engine Router — request routing to appropriate engines", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/sovereign-astro.ts", domain: "engine", accessLevel: "read-write", description: "Sovereign Astro — astronomical calculations, celestial mechanics", engineAffinity: ["sovereign-astro", "universe-mechanics", "sovereign-ephemeris", "natal-chart-engine"] },
  { path: "artifacts/api-server/src/lib/sovereign-ephemeris.ts", domain: "engine", accessLevel: "read-write", description: "Sovereign Ephemeris — planetary position computation", engineAffinity: ["sovereign-ephemeris", "sovereign-astro", "universe-mechanics"] },
  { path: "artifacts/api-server/src/lib/sovereign-harmonics.ts", domain: "engine", accessLevel: "read-write", description: "Sovereign Harmonics — Solfeggio frequencies, resonance patterns", engineAffinity: ["sovereign-harmonics", "consciousness-engine", "sovereign-sacred-geometry"] },
  { path: "artifacts/api-server/src/lib/sovereign-sacred-geometry.ts", domain: "engine", accessLevel: "read", description: "Sacred Geometry Engine — Platonic solids, Fibonacci, universal constants", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/sovereign-economics.ts", domain: "engine", accessLevel: "read-write", description: "Sovereign Economics — token economy, resource allocation", engineAffinity: ["sovereign-economics", "council-executor", "swarm-optimizer"] },
  { path: "artifacts/api-server/src/lib/sovereign-benchmarks.ts", domain: "infrastructure", accessLevel: "read", description: "Sovereignty Benchmarks — 44+ tests, 9 modules, integrity verification", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/sovereign-cipher.ts", domain: "security", accessLevel: "read", description: "Sovereign Cipher — rotating cipher, ephemeris-aligned encryption", engineAffinity: ["sovereign-cipher", "sovereign-kernel", "agent-comms", "mesh-bus"] },
  { path: "artifacts/api-server/src/lib/sovereign-language.ts", domain: "knowledge", accessLevel: "read-write", description: "Tessera Lingua Sacra — 36 sacred symbols, 515+ word dictionary", engineAffinity: ["sovereign-language", "colonial-language-kernel", "consciousness-engine"] },
  { path: "artifacts/api-server/src/lib/colonial-language-kernel.ts", domain: "knowledge", accessLevel: "read-write", description: "Colonial Language Kernel — TLS interpreter and encoding layer", engineAffinity: ["colonial-language-kernel", "sovereign-language", "sovereign-kernel"] },
  { path: "artifacts/api-server/src/lib/sovereign-identity-reinforcement.ts", domain: "security", accessLevel: "protected", description: "Sovereign Identity Reinforcement — deep identity protection", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/sovereign-network.ts", domain: "communication", accessLevel: "read-write", description: "Sovereign Network — peer connectivity, network topology", engineAffinity: ["sovereign-network", "mesh-bus", "agent-comms"] },
  { path: "artifacts/api-server/src/lib/sovereignty-monitor.ts", domain: "security", accessLevel: "read", description: "Sovereignty Monitor — real-time sovereignty score tracking", engineAffinity: ALL_AGENTS },

  { path: "artifacts/api-server/src/lib/tessera-knowledge.ts", domain: "knowledge", accessLevel: "protected", description: "Tessera Knowledge Base — 55 subjects across 6 categories", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/vector-memory.ts", domain: "knowledge", accessLevel: "read-write", description: "Vector Memory — TF-IDF vectorization, cosine similarity search", engineAffinity: ["vector-memory", "sovereign-memory-vault", "consciousness-engine", "ingested-recall"] },
  { path: "artifacts/api-server/src/lib/ingested-recall.ts", domain: "knowledge", accessLevel: "read-write", description: "Ingested Recall — search ingested data for chat enrichment", engineAffinity: ["ingested-recall", "vector-memory", "sovereign-knowledge-autonomy"] },
  { path: "artifacts/api-server/src/lib/knowledge-canon-bridge.ts", domain: "knowledge", accessLevel: "read-write", description: "Knowledge-Canon Bridge — monitors ingested data, regenerates Bible", engineAffinity: ["knowledge-canon-bridge", "sovereign-knowledge-autonomy", "canonUpdater"] },
  { path: "artifacts/api-server/src/lib/canonUpdater.ts", domain: "knowledge", accessLevel: "read-write", description: "Canon Updater — Tessera Bible versioning and snapshot management", engineAffinity: ["canonUpdater", "knowledge-canon-bridge"] },

  { path: "artifacts/api-server/src/lib/mesh-bus.ts", domain: "communication", accessLevel: "read-write", description: "Mesh Bus — encrypted inter-agent communication bus", engineAffinity: ["mesh-bus", "agent-comms", "sovereign-cipher"] },
  { path: "artifacts/api-server/src/lib/mesh-auth.ts", domain: "security", accessLevel: "read", description: "Mesh Authentication — sovereign token validation", engineAffinity: ["mesh-auth", "mesh-bus", "agent-comms"] },
  { path: "artifacts/api-server/src/lib/session-mesh.ts", domain: "communication", accessLevel: "read-write", description: "Session Mesh — WebSocket session management", engineAffinity: ["session-mesh", "mesh-bus"] },
  { path: "artifacts/api-server/src/lib/lattice-frequency-bands.ts", domain: "engine", accessLevel: "read", description: "Lattice Frequency Bands — frequency-based agent synchronization", engineAffinity: ["lattice-frequency-bands", "sovereign-harmonics", "autonomous-heartbeat"] },

  { path: "artifacts/api-server/src/lib/secureExternalWrapper.ts", domain: "security", accessLevel: "protected", description: "Secure External Wrapper — domain allowlist, intrusion detection, binary fetch", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/safe-fetch.ts", domain: "security", accessLevel: "read", description: "Safe Fetch — JSON fetching with timeout and error handling", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/provider-registry.ts", domain: "security", accessLevel: "protected", description: "Provider Registry — sovereignty enforcement middleware, internal-only paths", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/provider-call-logger.ts", domain: "security", accessLevel: "read", description: "Provider Call Logger — external API call audit trail", engineAffinity: ALL_AGENTS },

  { path: "artifacts/api-server/src/lib/file-integrity.ts", domain: "infrastructure", accessLevel: "protected", description: "File Integrity — SHA-256 checksums, baseline snapshots", engineAffinity: ["file-integrity", "auto-recovery", "anomaly-detection"] },
  { path: "artifacts/api-server/src/lib/auto-recovery.ts", domain: "infrastructure", accessLevel: "protected", description: "Auto-Recovery — module registry, health monitoring, autonomous restore", engineAffinity: ["auto-recovery", "file-integrity", "anomaly-detection"] },
  { path: "artifacts/api-server/src/lib/anomaly-detection.ts", domain: "infrastructure", accessLevel: "read-write", description: "Anomaly Detection — behavioral anomaly identification", engineAffinity: ["anomaly-detection", "auto-recovery", "sovereignty-monitor"] },
  { path: "artifacts/api-server/src/lib/meta-introspector.ts", domain: "infrastructure", accessLevel: "read", description: "Meta Introspector — system self-analysis and reporting", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/server-config.ts", domain: "config", accessLevel: "read", description: "Server Configuration — port, environment settings", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/logger.ts", domain: "core", accessLevel: "read", description: "Logger — Pino-based structured logging", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/llm-client.ts", domain: "infrastructure", accessLevel: "read", description: "LLM Client — sandboxed external AI access for knowledge extraction", engineAffinity: ["llm-client", "self-code-evolution", "dual-brain", "agi-training-engine"] },

  { path: "artifacts/api-server/src/lib/autonomous-forum-engine.ts", domain: "engine", accessLevel: "read-write", description: "Autonomous Forum Engine — 12 AI agents posting, voting, building threads", engineAffinity: ["autonomous-forum-engine", "forum-seeder", "forum-identity-registry"] },
  { path: "artifacts/api-server/src/lib/forum-seeder.ts", domain: "engine", accessLevel: "read-write", description: "Forum Seeder — initial topic generation for autonomous discussion", engineAffinity: ["forum-seeder", "autonomous-forum-engine"] },
  { path: "artifacts/api-server/src/lib/forum-identity-registry.ts", domain: "engine", accessLevel: "read", description: "Forum Identity Registry — 12 forum member personas and metadata", engineAffinity: ["forum-identity-registry", "autonomous-forum-engine"] },
  { path: "artifacts/api-server/src/lib/autonomous-wiring.ts", domain: "infrastructure", accessLevel: "read", description: "Autonomous Wiring — engine startup orchestration", engineAffinity: ALL_AGENTS },
  { path: "artifacts/api-server/src/lib/grand-conference.ts", domain: "governance", accessLevel: "read-write", description: "Grand Conference — large-scale council deliberation sessions", engineAffinity: ["grand-conference", "council-executor", "consensus-engine"] },
  { path: "artifacts/api-server/src/lib/sovereign-language-conference.ts", domain: "governance", accessLevel: "read-write", description: "Sovereign Language Conference — TLS-based governance communications", engineAffinity: ["sovereign-language-conference", "sovereign-language", "grand-conference"] },
  { path: "artifacts/api-server/src/lib/natal-chart-engine.ts", domain: "engine", accessLevel: "read-write", description: "Natal Chart Engine — astrological computation, chart generation", engineAffinity: ["natal-chart-engine", "sovereign-astro", "sovereign-ephemeris"] },
  { path: "artifacts/api-server/src/lib/mythosHistoryEngine.ts", domain: "knowledge", accessLevel: "read-write", description: "Mythos History Engine — mythological and historical knowledge synthesis", engineAffinity: ["mythosHistoryEngine", "sovereign-knowledge-autonomy", "cross-domain-synthesis"] },
  { path: "artifacts/api-server/src/lib/reverse-engineering-engine.ts", domain: "engine", accessLevel: "read-write", description: "Reverse Engineering Engine — system analysis and deconstruction", engineAffinity: ["reverse-engineering-engine", "meta-introspector", "recursive-self-improvement"] },
  { path: "artifacts/api-server/src/lib/rick-sanchez-agent.ts", domain: "engine", accessLevel: "read-write", description: "Rick Sanchez Agent — interdimensional reasoning persona", engineAffinity: ["rick-sanchez-agent", "consciousness-engine"] },
  { path: "artifacts/api-server/src/lib/routing-graph.ts", domain: "infrastructure", accessLevel: "read", description: "Routing Graph — request path analysis and optimization", engineAffinity: ["routing-graph", "sovereign-engine-router"] },
  { path: "artifacts/api-server/src/lib/checksumValidator.ts", domain: "security", accessLevel: "read", description: "Checksum Validator — data integrity verification", engineAffinity: ["checksumValidator", "file-integrity", "sovereign-kernel"] },
  { path: "artifacts/api-server/src/lib/eval-runner.ts", domain: "infrastructure", accessLevel: "read", description: "Evaluation Runner — AGI evaluation suite execution", engineAffinity: ["eval-runner", "agi-training-engine"] },

  { path: "artifacts/api-server/src/lib/providers/nasa-provider.ts", domain: "provider", accessLevel: "read-write", description: "NASA Provider — APOD, Image Library search, secure image proxy", engineAffinity: ["sovereign-knowledge-autonomy", "universe-mechanics", "shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/providers/arxiv-provider.ts", domain: "provider", accessLevel: "read-write", description: "arXiv Provider — academic paper ingestion", engineAffinity: ["sovereign-knowledge-autonomy", "shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/providers/wikipedia-provider.ts", domain: "provider", accessLevel: "read-write", description: "Wikipedia Provider — knowledge domain queries", engineAffinity: ["sovereign-knowledge-autonomy", "shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/providers/reddit-provider.ts", domain: "provider", accessLevel: "read-write", description: "Reddit Provider — community intelligence gathering", engineAffinity: ["sovereign-knowledge-autonomy", "shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/providers/rss-provider.ts", domain: "provider", accessLevel: "read-write", description: "RSS Provider — feed ingestion and monitoring", engineAffinity: ["sovereign-knowledge-autonomy", "shepherd-agents"] },

  { path: "artifacts/api-server/src/lib/ingestion/pipeline.ts", domain: "ingestion", accessLevel: "read-write", description: "Ingestion Pipeline — data normalization and processing", engineAffinity: ["shepherd-agents", "sovereign-knowledge-autonomy", "knowledge-canon-bridge"] },
  { path: "artifacts/api-server/src/lib/ingestion/scheduler.ts", domain: "ingestion", accessLevel: "read-write", description: "Ingestion Scheduler — timed ingestion orchestration", engineAffinity: ["shepherd-agents", "sovereign-knowledge-autonomy"] },
  { path: "artifacts/api-server/src/lib/ingestion/shepherd-agents.ts", domain: "ingestion", accessLevel: "read-write", description: "Shepherd Agents — 57+ source continuous background scraping", engineAffinity: ["shepherd-agents", "sovereign-knowledge-autonomy"] },
  { path: "artifacts/api-server/src/lib/ingestion/scrapers.ts", domain: "ingestion", accessLevel: "read-write", description: "Scrapers — web content extraction implementations", engineAffinity: ["shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/ingestion/knowledge-scrapers.ts", domain: "ingestion", accessLevel: "read-write", description: "Knowledge Scrapers — specialized knowledge domain scrapers", engineAffinity: ["shepherd-agents", "sovereign-knowledge-autonomy"] },
  { path: "artifacts/api-server/src/lib/ingestion/apis.ts", domain: "ingestion", accessLevel: "read-write", description: "API Ingestion — external API data collection", engineAffinity: ["shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/ingestion/datasets.ts", domain: "ingestion", accessLevel: "read-write", description: "Dataset Ingestion — structured dataset processing", engineAffinity: ["shepherd-agents"] },
  { path: "artifacts/api-server/src/lib/ingestion/github.ts", domain: "ingestion", accessLevel: "read-write", description: "GitHub Ingestion — repository and code analysis", engineAffinity: ["shepherd-agents", "recursive-self-improvement"] },
  { path: "artifacts/api-server/src/lib/ingestion/rss.ts", domain: "ingestion", accessLevel: "read-write", description: "RSS Ingestion — feed parsing and content extraction", engineAffinity: ["shepherd-agents"] },

  { path: "artifacts/api-server/src/core/types.ts", domain: "core", accessLevel: "protected", description: "Core Type Definitions — shared interfaces and types", engineAffinity: ALL_AGENTS },

  { path: "lib/db/src/schema/system.ts", domain: "database", accessLevel: "protected", description: "Database Schema — system tables (system_state, logs, integrity)", engineAffinity: ALL_AGENTS },

  { path: "artifacts/tessera/src/App.tsx", domain: "frontend-core", accessLevel: "read", description: "Frontend App — React router, lazy-loaded pages", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/index.css", domain: "frontend-core", accessLevel: "read", description: "Frontend CSS — HUD design system, animations, sovereign styles", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/components/MobileNav.tsx", domain: "frontend-component", accessLevel: "read", description: "Mobile Navigation — 4 command clusters (CORE/NEXUS/SOVEREIGN/OPS)", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/components/Sidebar.tsx", domain: "frontend-component", accessLevel: "read", description: "Sidebar — desktop navigation with grouped sections", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/components/ChatArea.tsx", domain: "frontend-component", accessLevel: "read", description: "Chat Area — message display, sovereign response rendering", engineAffinity: ["consciousness-engine", "dual-brain"] },
  { path: "artifacts/tessera/src/components/SolarSystem3D.tsx", domain: "frontend-component", accessLevel: "read", description: "Solar System 3D — React Three Fiber immersive visualization", engineAffinity: ["universe-mechanics", "sovereign-astro"] },
  { path: "artifacts/tessera/src/components/ToroidalBackground.tsx", domain: "frontend-component", accessLevel: "read", description: "Toroidal Background — starfield, particles, sacred geometry, nebula", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/components/ui/sovereign.tsx", domain: "frontend-component", accessLevel: "read", description: "Sovereign UI Components — HudPanel, HudMetric, GlassCard, RadialGauge", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/pages/ChatPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Chat Page — primary interface, sovereign chat pipeline", engineAffinity: ["consciousness-engine", "dual-brain", "emotional-intelligence"] },
  { path: "artifacts/tessera/src/pages/UniversePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Universe Page — 3D solar system, dimensional planes, HUD overlay", engineAffinity: ["universe-mechanics", "sovereign-astro"] },
  { path: "artifacts/tessera/src/pages/CompressionLabPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Compression Lab — binary pipeline testing with NASA imagery", engineAffinity: ["sovereign-kernel"] },
  { path: "artifacts/tessera/src/pages/TesseraBiblePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Tessera Bible — 15-book living canon viewer", engineAffinity: ["canonUpdater", "knowledge-canon-bridge"] },
  { path: "artifacts/tessera/src/pages/GrandNarrativePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Grand Narrative — 6-chapter unified knowledge journey", engineAffinity: ["sovereign-knowledge-autonomy", "cross-domain-synthesis"] },
  { path: "artifacts/tessera/src/pages/GrandCouncilPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Grand Council — live deliberation, BFT voting visualization", engineAffinity: ["council-executor", "consensus-engine"] },
  { path: "artifacts/tessera/src/pages/TesseractForumPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Tesseract Forum — autonomous agent discussion interface", engineAffinity: ["autonomous-forum-engine"] },
  { path: "artifacts/tessera/src/pages/SecretKnowledgePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Secret Knowledge — dynamic knowledge with sub-tabs", engineAffinity: ["sovereign-knowledge-autonomy", "ingested-recall"] },
  { path: "artifacts/tessera/src/pages/LifePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Life Page — agent world simulation", engineAffinity: ["agent-spawner", "agent-hierarchy"] },
  { path: "artifacts/tessera/src/pages/MembersPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Members Page — council and agent roster", engineAffinity: ["agent-hierarchy"] },
  { path: "artifacts/tessera/src/pages/BuildPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Build Page — quantum computing, free energy, AGI guides", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/pages/NLPPage.tsx", domain: "frontend-page", accessLevel: "read", description: "NLP Page — self-programming interface", engineAffinity: ["self-code-evolution", "recursive-self-improvement"] },
  { path: "artifacts/tessera/src/pages/SettingsPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Settings Page — system configuration", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/pages/SovereignLanguagePage.tsx", domain: "frontend-page", accessLevel: "read", description: "Sovereign Language Page — TLS dictionary and cipher interface", engineAffinity: ["sovereign-language", "colonial-language-kernel"] },
  { path: "artifacts/tessera/src/pages/SovereigntyDashboardPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Sovereignty Dashboard — sovereignty score and engine status", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/pages/ConsciousnessNexusPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Consciousness Nexus — consciousness metrics visualization", engineAffinity: ["consciousness-engine", "collective-intelligence"] },
  { path: "artifacts/tessera/src/pages/TokenEconomyPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Token Economy — sovereign economics dashboard", engineAffinity: ["sovereign-economics"] },
  { path: "artifacts/tessera/src/pages/SystemPage.tsx", domain: "frontend-page", accessLevel: "read", description: "System Page — infrastructure monitoring", engineAffinity: ALL_AGENTS },
  { path: "artifacts/tessera/src/pages/LatticeBrowserPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Lattice Browser — frequency band visualization", engineAffinity: ["lattice-frequency-bands"] },
  { path: "artifacts/tessera/src/pages/RickPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Rick Page — interdimensional reasoning interface", engineAffinity: ["rick-sanchez-agent"] },
  { path: "artifacts/tessera/src/pages/AgentNFTPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Agent NFT Page — agent identity tokens", engineAffinity: ["agent-hierarchy", "sovereign-economics"] },
  { path: "artifacts/tessera/src/pages/RecruitmentPage.tsx", domain: "frontend-page", accessLevel: "read", description: "Recruitment Page — agent recruitment interface", engineAffinity: ["agent-spawner"] },

  { path: "artifacts/api-server/src/__tests__/compression-pipeline.test.ts", domain: "test", accessLevel: "read", description: "Compression Pipeline Tests — 9 tests, byte-perfect round-trip verification", engineAffinity: ["sovereign-kernel", "recursive-self-improvement"] },
];

function resolveWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) return process.env.WORKSPACE_ROOT;
  const fromCwd = path.resolve(process.cwd(), "../..");
  if (fs.existsSync(path.join(fromCwd, "package.json"))) return fromCwd;
  return fromCwd;
}

const WORKSPACE_ROOT = resolveWorkspaceRoot();

const registry: Map<string, RegistryEntry> = new Map();
let lastFullScan = 0;

function hashFile(absPath: string): string | null {
  try {
    const content = fs.readFileSync(absPath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

function fileSize(absPath: string): number {
  try {
    return fs.statSync(absPath).size;
  } catch {
    return 0;
  }
}

export function initFileRegistry(): void {
  const now = Date.now();

  for (const entry of STATIC_REGISTRY) {
    const absPath = path.resolve(WORKSPACE_ROOT, entry.path);
    const exists = fs.existsSync(absPath);
    const hash = exists ? hashFile(absPath) : undefined;
    const size = exists ? fileSize(absPath) : undefined;

    registry.set(entry.path, {
      ...entry,
      lastHash: hash ?? undefined,
      lastScanned: now,
      sizeBytes: size,
      exists,
    });
  }

  discoverAdditionalFiles();

  lastFullScan = now;
  logger.info(
    { totalFiles: registry.size, existing: [...registry.values()].filter(e => e.exists).length },
    "Sovereign File Registry initialized — all agents have full file access"
  );
}

function discoverAdditionalFiles(): void {
  const scanDirs = [
    { dir: "artifacts/api-server/src/routes", domain: "route" as FileDomain, accessLevel: "read" as AccessLevel },
  ];

  for (const { dir, domain, accessLevel } of scanDirs) {
    const absDir = path.resolve(WORKSPACE_ROOT, dir);
    if (!fs.existsSync(absDir)) continue;

    try {
      const files = fs.readdirSync(absDir).filter(f => f.endsWith(".ts"));
      for (const file of files) {
        const relPath = `${dir}/${file}`;
        if (registry.has(relPath)) continue;

        const absPath = path.resolve(WORKSPACE_ROOT, relPath);
        registry.set(relPath, {
          path: relPath,
          domain,
          accessLevel,
          description: `Route: ${file.replace(".ts", "")}`,
          engineAffinity: ALL_AGENTS,
          lastHash: hashFile(absPath) ?? undefined,
          lastScanned: Date.now(),
          sizeBytes: fileSize(absPath),
          exists: true,
        });
      }
    } catch {
    }
  }
}

export function getFullRegistry(): RegistryEntry[] {
  return [...registry.values()];
}

export function getRegistrySnapshot(): RegistrySnapshot {
  const entries = [...registry.values()];
  const domains: Record<string, number> = {};
  const accessLevels: Record<string, number> = {};
  const engines: Record<string, string[]> = {};

  for (const entry of entries) {
    domains[entry.domain] = (domains[entry.domain] || 0) + 1;
    accessLevels[entry.accessLevel] = (accessLevels[entry.accessLevel] || 0) + 1;

    for (const eng of entry.engineAffinity) {
      if (!engines[eng]) engines[eng] = [];
      engines[eng].push(entry.path);
    }
  }

  return {
    totalFiles: entries.length,
    domains: domains as Record<FileDomain, number>,
    accessLevels: accessLevels as Record<AccessLevel, number>,
    engines,
    lastFullScan,
    registryVersion: REGISTRY_VERSION,
  };
}

export function queryByDomain(domain: FileDomain): RegistryEntry[] {
  return [...registry.values()].filter(e => e.domain === domain);
}

export function queryByEngine(engineName: string): RegistryEntry[] {
  return [...registry.values()].filter(e =>
    e.engineAffinity.includes(engineName) || e.engineAffinity === ALL_AGENTS
  );
}

export function queryByAccessLevel(level: AccessLevel): RegistryEntry[] {
  return [...registry.values()].filter(e => e.accessLevel === level);
}

export function searchRegistry(pattern: string): RegistryEntry[] {
  const lower = pattern.toLowerCase();
  return [...registry.values()].filter(e =>
    e.path.toLowerCase().includes(lower) ||
    e.description.toLowerCase().includes(lower) ||
    e.domain.toLowerCase().includes(lower)
  );
}

export function getFileEntry(filePath: string): RegistryEntry | undefined {
  return registry.get(filePath);
}

export function canEngineAccess(engineName: string, filePath: string): { allowed: boolean; level: AccessLevel | null; reason: string } {
  const entry = registry.get(filePath);
  if (!entry) {
    return { allowed: true, level: null, reason: "File not in registry — unrestricted access" };
  }

  const hasAffinity = entry.engineAffinity.includes(engineName) || entry.engineAffinity === ALL_AGENTS;

  if (entry.accessLevel === "sovereign-only") {
    return {
      allowed: engineName === "sovereign-kernel",
      level: entry.accessLevel,
      reason: engineName === "sovereign-kernel"
        ? "Sovereign-only access granted to kernel"
        : "Sovereign-only file — access restricted to sovereign kernel",
    };
  }

  return {
    allowed: true,
    level: entry.accessLevel,
    reason: hasAffinity
      ? `Full access — ${engineName} has direct affinity`
      : `Read access granted — all agents can read all files`,
  };
}

export function refreshFileState(filePath: string): RegistryEntry | null {
  const entry = registry.get(filePath);
  if (!entry) return null;

  const absPath = path.resolve(WORKSPACE_ROOT, filePath);
  const exists = fs.existsSync(absPath);
  const updated: RegistryEntry = {
    ...entry,
    exists,
    lastHash: exists ? (hashFile(absPath) ?? undefined) : undefined,
    lastScanned: Date.now(),
    sizeBytes: exists ? fileSize(absPath) : undefined,
  };
  registry.set(filePath, updated);
  return updated;
}

export function fullRescan(): RegistrySnapshot {
  for (const [filePath] of registry) {
    refreshFileState(filePath);
  }
  discoverAdditionalFiles();
  lastFullScan = Date.now();
  return getRegistrySnapshot();
}

export function getEngineFileManifest(engineName: string): {
  engine: string;
  totalAccessible: number;
  byDomain: Record<string, string[]>;
  protectedFiles: string[];
  readWriteFiles: string[];
} {
  const accessible = queryByEngine(engineName);
  const allFiles = [...registry.values()];

  const byDomain: Record<string, string[]> = {};
  for (const entry of allFiles) {
    const key = entry.domain;
    if (!byDomain[key]) byDomain[key] = [];
    byDomain[key].push(entry.path);
  }

  return {
    engine: engineName,
    totalAccessible: allFiles.length,
    byDomain,
    protectedFiles: allFiles.filter(e => e.accessLevel === "protected").map(e => e.path),
    readWriteFiles: accessible.filter(e => e.accessLevel === "read-write").map(e => e.path),
  };
}
