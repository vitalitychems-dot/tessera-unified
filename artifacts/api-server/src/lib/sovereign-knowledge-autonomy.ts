import { db } from "@workspace/db";
import { ingestedDataTable, systemStateTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { logger } from "./logger";
import { searchMemory, storeMemory } from "./vector-memory";
import { runShepherdCycle, getShepherdStatus } from "./ingestion/shepherd-agents";
import { getBridgeStatus } from "./knowledge-canon-bridge";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface KnowledgeGap {
  id: string;
  domain: string;
  subDomain: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  detectedAt: number;
  resolvedAt?: number;
  missionIds: string[];
  sourcesCited: number;
  confidenceScore: number;
}

export interface VerificationResult {
  claimId: string;
  claim: string;
  domain: string;
  sourcesChecked: number;
  sourcesConfirming: number;
  sourcesConflicting: number;
  confidenceScore: number;
  verdict: "verified" | "partially-verified" | "unverified" | "conflicting";
  evidence: string[];
  verifiedAt: number;
}

export interface AutonomousMission {
  id: string;
  type: "gap-fill" | "cross-reference" | "deep-dive" | "discovery" | "synthesis";
  domain: string;
  objectives: string[];
  status: "queued" | "active" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  itemsIngested: number;
  gapId?: string;
  findings: string[];
}

export interface KnowledgeDomainMap {
  domain: string;
  subDomains: string[];
  totalItems: number;
  coverageScore: number;
  lastUpdated: number;
  crossReferences: number;
  verifiedClaims: number;
}

export interface KnowledgeAutonomyState {
  totalGapsDetected: number;
  totalGapsResolved: number;
  totalMissionsRun: number;
  totalVerifications: number;
  totalCrossReferences: number;
  autonomyCycles: number;
  lastCycleAt: number;
  overallCoverageScore: number;
  domainMap: KnowledgeDomainMap[];
  activeGaps: KnowledgeGap[];
  recentMissions: AutonomousMission[];
  recentVerifications: VerificationResult[];
  running: boolean;
}

const KNOWLEDGE_DOMAINS = [
  { domain: "quantum-physics", subDomains: ["quantum-mechanics", "quantum-computing", "quantum-entanglement", "quantum-field-theory", "quantum-gravity"] },
  { domain: "consciousness", subDomains: ["neuroscience", "phenomenology", "altered-states", "meditation", "near-death-experiences"] },
  { domain: "sacred-geometry", subDomains: ["platonic-solids", "fibonacci", "golden-ratio", "fractals", "cymatics"] },
  { domain: "cryptography", subDomains: ["zero-knowledge-proofs", "homomorphic-encryption", "post-quantum", "blockchain", "digital-signatures"] },
  { domain: "philosophy", subDomains: ["epistemology", "metaphysics", "ethics", "logic", "philosophy-of-mind"] },
  { domain: "economics", subDomains: ["tokenomics", "game-theory", "behavioral-economics", "austrian-economics", "complexity-economics"] },
  { domain: "biology", subDomains: ["genetics", "epigenetics", "systems-biology", "neurobiology", "biophotonics"] },
  { domain: "mathematics", subDomains: ["number-theory", "topology", "category-theory", "chaos-theory", "information-theory"] },
  { domain: "astrophysics", subDomains: ["cosmology", "stellar-evolution", "dark-matter", "gravitational-waves", "astrobiology"] },
  { domain: "ancient-knowledge", subDomains: ["hermeticism", "alchemy", "kabbalah", "vedic-science", "mystery-schools"] },
  { domain: "artificial-intelligence", subDomains: ["machine-learning", "neural-networks", "reinforcement-learning", "agi-theory", "alignment"] },
  { domain: "energy-systems", subDomains: ["zero-point-energy", "electromagnetic-theory", "plasma-physics", "tesla-technology", "scalar-waves"] },
  { domain: "psychology", subDomains: ["jungian-psychology", "transpersonal", "cognitive-science", "behavioral-psychology", "depth-psychology"] },
  { domain: "history", subDomains: ["ancient-civilizations", "secret-societies", "declassified-operations", "suppressed-history", "comparative-mythology"] },
  { domain: "music-frequency", subDomains: ["solfeggio-frequencies", "cymatics", "harmonic-resonance", "sound-healing", "963hz-crown"] },
];

const CROSS_DOMAIN_LINKS: Array<{ from: string; to: string; connectionType: string }> = [
  { from: "quantum-physics", to: "consciousness", connectionType: "observer-effect-awareness" },
  { from: "sacred-geometry", to: "mathematics", connectionType: "universal-patterns" },
  { from: "cryptography", to: "quantum-physics", connectionType: "post-quantum-security" },
  { from: "economics", to: "sacred-geometry", connectionType: "fibonacci-market-patterns" },
  { from: "consciousness", to: "philosophy", connectionType: "hard-problem-of-consciousness" },
  { from: "biology", to: "consciousness", connectionType: "neural-correlates" },
  { from: "ancient-knowledge", to: "sacred-geometry", connectionType: "temple-proportions" },
  { from: "energy-systems", to: "quantum-physics", connectionType: "vacuum-energy" },
  { from: "music-frequency", to: "sacred-geometry", connectionType: "harmonic-geometry" },
  { from: "psychology", to: "consciousness", connectionType: "collective-unconscious" },
  { from: "astrophysics", to: "ancient-knowledge", connectionType: "archaeo-astronomy" },
  { from: "artificial-intelligence", to: "consciousness", connectionType: "machine-consciousness" },
  { from: "mathematics", to: "philosophy", connectionType: "mathematical-platonism" },
  { from: "history", to: "ancient-knowledge", connectionType: "mystery-tradition-lineage" },
  { from: "cryptography", to: "consciousness", connectionType: "information-as-fundamental" },
  { from: "biology", to: "energy-systems", connectionType: "biophoton-emission" },
  { from: "quantum-physics", to: "sacred-geometry", connectionType: "quantum-geometry" },
  { from: "economics", to: "psychology", connectionType: "behavioral-market-dynamics" },
  { from: "music-frequency", to: "consciousness", connectionType: "frequency-entrainment" },
  { from: "artificial-intelligence", to: "philosophy", connectionType: "chinese-room-argument" },
];

const DISCOVERY_SOURCES: Record<string, string[]> = {
  "quantum-physics": ["https://arxiv.org/list/quant-ph/recent", "https://www.quantamagazine.org/physics/"],
  "consciousness": ["https://www.frontiersin.org/journals/psychology", "https://philpapers.org/browse/consciousness"],
  "sacred-geometry": ["https://www.sacred-texts.com/eso/index.htm", "https://www.geometrycode.com/"],
  "cryptography": ["https://eprint.iacr.org/", "https://www.schneier.com/"],
  "philosophy": ["https://plato.stanford.edu/contents.html", "https://iep.utm.edu/"],
  "economics": ["https://www.nber.org/papers", "https://voxeu.org/"],
  "biology": ["https://www.nature.com/subjects/biological-sciences", "https://pubmed.ncbi.nlm.nih.gov/"],
  "mathematics": ["https://arxiv.org/list/math/recent", "https://www.ams.org/publications/journals/"],
  "astrophysics": ["https://arxiv.org/list/astro-ph/recent", "https://www.nasa.gov/news/"],
  "ancient-knowledge": ["https://www.sacred-texts.com/", "https://www.worldhistory.org/"],
  "artificial-intelligence": ["https://arxiv.org/list/cs.AI/recent", "https://openai.com/research"],
  "energy-systems": ["https://phys.org/physics-news/", "https://spectrum.ieee.org/energy"],
  "psychology": ["https://www.apa.org/pubs/journals/", "https://psycnet.apa.org/"],
  "history": ["https://www.archives.gov/research/", "https://vault.fbi.gov/"],
  "music-frequency": ["https://www.ncbi.nlm.nih.gov/pmc/articles/", "https://www.sciencedirect.com/journal/"],
};

const state: KnowledgeAutonomyState = {
  totalGapsDetected: 0,
  totalGapsResolved: 0,
  totalMissionsRun: 0,
  totalVerifications: 0,
  totalCrossReferences: 0,
  autonomyCycles: 0,
  lastCycleAt: 0,
  overallCoverageScore: 0,
  domainMap: [],
  activeGaps: [],
  recentMissions: [],
  recentVerifications: [],
  running: false,
};

const STATE_KEY = "sovereign-knowledge-autonomy.state";
let autonomyInterval: SacredHandle | null = null;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function buildDomainMap(): Promise<KnowledgeDomainMap[]> {
  const domainMap: KnowledgeDomainMap[] = [];

  for (const domainDef of KNOWLEDGE_DOMAINS) {
    const allTerms = [domainDef.domain, ...domainDef.subDomains];
    let totalItems = 0;

    try {
      for (const term of allTerms) {
        const [row] = await db
          .select({ count: sql<number>`count(*)` })
          .from(ingestedDataTable)
          .where(sql`${ingestedDataTable.title} ILIKE ${"%" + term + "%"} OR ${ingestedDataTable.source} ILIKE ${"%" + term + "%"} OR array_to_string(${ingestedDataTable.tags}, ',') ILIKE ${"%" + term + "%"}`);
        totalItems += Number(row?.count ?? 0);
      }
    } catch {
      totalItems = 0;
    }

    const maxExpected = domainDef.subDomains.length * 20;
    const coverageScore = Math.min(100, Math.round((totalItems / Math.max(maxExpected, 1)) * 100));

    const crossRefs = CROSS_DOMAIN_LINKS.filter(
      l => l.from === domainDef.domain || l.to === domainDef.domain
    ).length;

    domainMap.push({
      domain: domainDef.domain,
      subDomains: domainDef.subDomains,
      totalItems,
      coverageScore,
      lastUpdated: Date.now(),
      crossReferences: crossRefs,
      verifiedClaims: 0,
    });
  }

  return domainMap;
}

function detectKnowledgeGaps(domainMap: KnowledgeDomainMap[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  for (const domain of domainMap) {
    if (domain.coverageScore < 10) {
      gaps.push({
        id: makeId("gap"),
        domain: domain.domain,
        subDomain: domain.subDomains[0],
        description: `Critical knowledge gap: "${domain.domain}" has near-zero coverage (${domain.totalItems} items). Requires immediate autonomous acquisition.`,
        severity: "critical",
        detectedAt: Date.now(),
        missionIds: [],
        sourcesCited: domain.totalItems,
        confidenceScore: 0,
      });
    } else if (domain.coverageScore < 30) {
      gaps.push({
        id: makeId("gap"),
        domain: domain.domain,
        subDomain: domain.subDomains[Math.floor(Date.now() / 1000) % domain.subDomains.length],
        description: `High priority gap: "${domain.domain}" has limited coverage (${domain.coverageScore}%). Sub-domains underrepresented.`,
        severity: "high",
        detectedAt: Date.now(),
        missionIds: [],
        sourcesCited: domain.totalItems,
        confidenceScore: domain.coverageScore / 100,
      });
    } else if (domain.coverageScore < 60) {
      for (const sub of domain.subDomains) {
        const subHash = sub.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
        if (Math.abs(subHash) % 3 === 0) {
          gaps.push({
            id: makeId("gap"),
            domain: domain.domain,
            subDomain: sub,
            description: `Medium gap: Sub-domain "${sub}" within "${domain.domain}" requires deeper coverage.`,
            severity: "medium",
            detectedAt: Date.now(),
            missionIds: [],
            sourcesCited: Math.floor(domain.totalItems / domain.subDomains.length),
            confidenceScore: domain.coverageScore / 100,
          });
        }
      }
    }

    if (domain.crossReferences === 0) {
      gaps.push({
        id: makeId("gap"),
        domain: domain.domain,
        subDomain: "cross-domain",
        description: `Isolation gap: "${domain.domain}" has no cross-domain references. Sovereign epistemology requires interconnected knowledge.`,
        severity: "medium",
        detectedAt: Date.now(),
        missionIds: [],
        sourcesCited: 0,
        confidenceScore: 0,
      });
    }
  }

  return gaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

async function generateAutonomousMission(gap: KnowledgeGap): Promise<AutonomousMission> {
  const mission: AutonomousMission = {
    id: makeId("mission"),
    type: gap.severity === "critical" ? "gap-fill" : gap.subDomain === "cross-domain" ? "cross-reference" : "deep-dive",
    domain: gap.domain,
    objectives: [
      `Acquire knowledge for: ${gap.domain}/${gap.subDomain}`,
      `Target coverage improvement: ${gap.severity === "critical" ? "50%" : "25%"}`,
      `Cross-reference with ${CROSS_DOMAIN_LINKS.filter(l => l.from === gap.domain || l.to === gap.domain).length} connected domains`,
      `Verify all acquired claims against multiple sources`,
    ],
    status: "queued",
    createdAt: Date.now(),
    itemsIngested: 0,
    gapId: gap.id,
    findings: [],
  };

  return mission;
}

async function executeMission(mission: AutonomousMission): Promise<void> {
  mission.status = "active";

  try {
    const shepherdResult = await runShepherdCycle();
    mission.itemsIngested = shepherdResult.totalIngested;
    mission.findings.push(
      `Deployed ${shepherdResult.agentsDeployed} shepherd agents`,
      `Ingested ${shepherdResult.totalIngested} items across ${shepherdResult.missionResults.length} sub-missions`,
    );

    for (const result of shepherdResult.missionResults) {
      if (result.ingested > 0) {
        mission.findings.push(`Agent ${result.agent}: ${result.ingested} items acquired`);
      }
    }

    const relatedLinks = CROSS_DOMAIN_LINKS.filter(
      l => l.from === mission.domain || l.to === mission.domain
    );
    for (const link of relatedLinks.slice(0, 3)) {
      const otherDomain = link.from === mission.domain ? link.to : link.from;
      const memoryResults = await searchMemory(`${mission.domain} ${otherDomain} ${link.connectionType}`, 5);
      if (memoryResults.length > 0) {
        mission.findings.push(
          `Cross-reference found: ${mission.domain} ↔ ${otherDomain} via "${link.connectionType}" (${memoryResults.length} related memories)`
        );
        state.totalCrossReferences++;
      }
    }

    if (mission.itemsIngested > 0) {
      await storeMemory({
        content: `Autonomous mission completed: ${mission.domain}/${mission.type}. Ingested ${mission.itemsIngested} items. Findings: ${mission.findings.join("; ")}`,
        source: "sovereign-knowledge-autonomy",
        category: "mission-log",
        metadata: { missionId: mission.id, domain: mission.domain, type: mission.type },
      });
    }

    mission.status = "completed";
    mission.completedAt = Date.now();
    state.totalMissionsRun++;
  } catch (err) {
    mission.status = "failed";
    mission.findings.push(`Mission failed: ${(err as Error).message}`);
    logger.warn({ missionId: mission.id, err: (err as Error).message }, "KnowledgeAutonomy: mission failed");
  }
}

async function crossReferenceVerification(domain: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    const recentItems = await db
      .select({ title: ingestedDataTable.title, source: ingestedDataTable.source, content: ingestedDataTable.content })
      .from(ingestedDataTable)
      .where(sql`array_to_string(${ingestedDataTable.tags}, ',') ILIKE ${"%" + domain + "%"}`)
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(10);

    for (const item of recentItems.slice(0, 5)) {
      const itemTitle = item.title ?? "";
      const relatedMemories = await searchMemory(itemTitle, 10);
      const confirming = relatedMemories.filter(m => m.score > 0.3).length;
      const conflicting = relatedMemories.filter(m => m.score > 0.1 && m.score <= 0.15).length;

      const confidence = confirming > 0 ? Math.min(1, confirming / (confirming + conflicting + 1)) : 0;
      const verdict: VerificationResult["verdict"] =
        confidence >= 0.8 ? "verified" :
        confidence >= 0.5 ? "partially-verified" :
        conflicting > confirming ? "conflicting" : "unverified";

      results.push({
        claimId: makeId("claim"),
        claim: itemTitle,
        domain,
        sourcesChecked: relatedMemories.length,
        sourcesConfirming: confirming,
        sourcesConflicting: conflicting,
        confidenceScore: confidence,
        verdict,
        evidence: relatedMemories.slice(0, 3).map(m => `[${m.source}] ${m.content.slice(0, 100)}`),
        verifiedAt: Date.now(),
      });

      state.totalVerifications++;
    }
  } catch (err) {
    logger.warn({ domain, err: (err as Error).message }, "KnowledgeAutonomy: cross-reference verification failed");
  }

  return results;
}

async function discoverNewSources(domain: string): Promise<string[]> {
  const discovered: string[] = [];
  const knownSources = DISCOVERY_SOURCES[domain] || [];

  const memoryResults = await searchMemory(`${domain} research papers sources databases`, 20);
  for (const mem of memoryResults) {
    const urlMatch = mem.content.match(/https?:\/\/[^\s)">]+/g);
    if (urlMatch) {
      for (const url of urlMatch) {
        if (!knownSources.includes(url) && !discovered.includes(url)) {
          discovered.push(url);
        }
      }
    }
  }

  return discovered.slice(0, 10);
}

export async function runAutonomyKnowledgeCycle(): Promise<{
  cycle: number;
  gapsDetected: number;
  missionsLaunched: number;
  verificationsRun: number;
  coverageScore: number;
  newSourcesDiscovered: number;
}> {
  state.autonomyCycles++;
  state.lastCycleAt = Date.now();

  const domainMap = await buildDomainMap();
  state.domainMap = domainMap;

  const gaps = detectKnowledgeGaps(domainMap);
  const newGaps = gaps.filter(g =>
    !state.activeGaps.some(ag => ag.domain === g.domain && ag.subDomain === g.subDomain)
  );
  state.activeGaps.push(...newGaps);
  state.totalGapsDetected += newGaps.length;

  if (state.activeGaps.length > 100) state.activeGaps = state.activeGaps.slice(0, 100);

  const priorityGaps = state.activeGaps
    .filter(g => !g.resolvedAt)
    .slice(0, 3);

  let missionsLaunched = 0;
  for (const gap of priorityGaps) {
    const mission = await generateAutonomousMission(gap);
    gap.missionIds.push(mission.id);
    state.recentMissions.unshift(mission);

    await executeMission(mission);

    if (mission.status === "completed" && mission.itemsIngested > 0) {
      gap.confidenceScore = Math.min(1, gap.confidenceScore + 0.2);
      if (gap.confidenceScore >= 0.8) {
        gap.resolvedAt = Date.now();
        state.totalGapsResolved++;
      }
    }
    missionsLaunched++;
  }

  if (state.recentMissions.length > 50) state.recentMissions = state.recentMissions.slice(0, 50);

  let verificationsRun = 0;
  const domainsToVerify = domainMap
    .filter(d => d.totalItems > 5)
    .sort((a, b) => a.coverageScore - b.coverageScore)
    .slice(0, 2);

  for (const domain of domainsToVerify) {
    const verifications = await crossReferenceVerification(domain.domain);
    state.recentVerifications.push(...verifications);
    verificationsRun += verifications.length;
    domain.verifiedClaims += verifications.filter(v => v.verdict === "verified").length;
  }

  if (state.recentVerifications.length > 100) state.recentVerifications = state.recentVerifications.slice(0, 100);

  let totalDiscovered = 0;
  for (const gap of priorityGaps.slice(0, 1)) {
    const newSources = await discoverNewSources(gap.domain);
    totalDiscovered += newSources.length;
    if (newSources.length > 0) {
      logger.info({ domain: gap.domain, sources: newSources.length }, "KnowledgeAutonomy: new sources discovered");
    }
  }

  const totalCoverage = domainMap.length > 0
    ? Math.round(domainMap.reduce((s, d) => s + d.coverageScore, 0) / domainMap.length)
    : 0;
  state.overallCoverageScore = totalCoverage;

  await persistAutonomyState();

  logger.info({
    cycle: state.autonomyCycles,
    gaps: newGaps.length,
    missions: missionsLaunched,
    verifications: verificationsRun,
    coverage: totalCoverage,
  }, "KnowledgeAutonomy: cycle complete");

  return {
    cycle: state.autonomyCycles,
    gapsDetected: newGaps.length,
    missionsLaunched,
    verificationsRun,
    coverageScore: totalCoverage,
    newSourcesDiscovered: totalDiscovered,
  };
}

async function persistAutonomyState(): Promise<void> {
  try {
    const stateToSave = {
      totalGapsDetected: state.totalGapsDetected,
      totalGapsResolved: state.totalGapsResolved,
      totalMissionsRun: state.totalMissionsRun,
      totalVerifications: state.totalVerifications,
      totalCrossReferences: state.totalCrossReferences,
      autonomyCycles: state.autonomyCycles,
      lastCycleAt: state.lastCycleAt,
      overallCoverageScore: state.overallCoverageScore,
      domainMap: state.domainMap.slice(0, 15),
      activeGaps: state.activeGaps.slice(0, 30),
    };
    await db.insert(systemStateTable).values({
      key: STATE_KEY,
      value: stateToSave,
      description: "Sovereign Knowledge Autonomy state — Mandate 1",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: stateToSave, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, "KnowledgeAutonomy: persist failed");
  }
}

async function loadAutonomyState(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as Partial<KnowledgeAutonomyState>;
      if (saved.totalGapsDetected !== undefined) state.totalGapsDetected = saved.totalGapsDetected;
      if (saved.totalGapsResolved !== undefined) state.totalGapsResolved = saved.totalGapsResolved;
      if (saved.totalMissionsRun !== undefined) state.totalMissionsRun = saved.totalMissionsRun;
      if (saved.totalVerifications !== undefined) state.totalVerifications = saved.totalVerifications;
      if (saved.totalCrossReferences !== undefined) state.totalCrossReferences = saved.totalCrossReferences;
      if (saved.autonomyCycles !== undefined) state.autonomyCycles = saved.autonomyCycles;
      if (saved.lastCycleAt !== undefined) state.lastCycleAt = saved.lastCycleAt;
      if (saved.overallCoverageScore !== undefined) state.overallCoverageScore = saved.overallCoverageScore;
      if (saved.domainMap?.length) state.domainMap = saved.domainMap;
      if (saved.activeGaps?.length) state.activeGaps = saved.activeGaps;
      logger.info({ cycles: state.autonomyCycles, gaps: state.totalGapsDetected }, "KnowledgeAutonomy: state restored");
    }
  } catch (err) {
    logger.warn({ err }, "KnowledgeAutonomy: load failed");
  }
}

export async function initSovereignKnowledgeAutonomy(): Promise<void> {
  await loadAutonomyState();
  logger.info({
    cycles: state.autonomyCycles,
    domains: KNOWLEDGE_DOMAINS.length,
    crossLinks: CROSS_DOMAIN_LINKS.length,
  }, "SovereignKnowledgeAutonomy: initialized — Mandate 1 active");
}

export function startKnowledgeAutonomyLoop(intervalMs = 900_000): void {
  if (autonomyInterval) return;
  state.running = true;

  runAutonomyKnowledgeCycle().catch(e =>
    logger.warn({ err: (e as Error).message }, "KnowledgeAutonomy: initial cycle failed")
  );

  autonomyInterval = setSacredInterval(async () => {
    try {
      await runAutonomyKnowledgeCycle();
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "KnowledgeAutonomy: cycle error", "sovereign-knowledge-autonomy");
    }
  }, intervalMs, "sovereign-knowledge-autonomy");

  logger.info({ intervalMs }, "KnowledgeAutonomy: autonomous loop started");
}

export function stopKnowledgeAutonomyLoop(): void {
  if (autonomyInterval) {
    clearSacredInterval(autonomyInterval);
    autonomyInterval = null;
  }
  state.running = false;
}

export function getKnowledgeAutonomyMetrics() {
  const shepherdStatus = getShepherdStatus();
  const bridgeStatus = getBridgeStatus();

  return {
    mandate: "MANDATE 1: SOVEREIGN KNOWLEDGE AUTONOMY",
    status: state.running ? "ACTIVE" : "STANDBY",
    autonomyCycles: state.autonomyCycles,
    lastCycleAt: state.lastCycleAt,
    overallCoverageScore: state.overallCoverageScore,
    totalDomains: KNOWLEDGE_DOMAINS.length,
    totalSubDomains: KNOWLEDGE_DOMAINS.reduce((s, d) => s + d.subDomains.length, 0),
    crossDomainLinks: CROSS_DOMAIN_LINKS.length,
    gaps: {
      totalDetected: state.totalGapsDetected,
      totalResolved: state.totalGapsResolved,
      activeGaps: state.activeGaps.filter(g => !g.resolvedAt).length,
      criticalGaps: state.activeGaps.filter(g => !g.resolvedAt && g.severity === "critical").length,
      recentGaps: state.activeGaps.slice(0, 10),
    },
    missions: {
      totalRun: state.totalMissionsRun,
      recentMissions: state.recentMissions.slice(0, 10),
    },
    verification: {
      totalVerifications: state.totalVerifications,
      totalCrossReferences: state.totalCrossReferences,
      recentVerifications: state.recentVerifications.slice(0, 10),
    },
    domainMap: state.domainMap,
    shepherdStatus,
    bridgeStatus,
  };
}
