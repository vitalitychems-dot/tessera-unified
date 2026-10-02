import { createHash, randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  livingBibleChaptersTable,
  livingHistoryErasTable,
  agentTrainingRecordsTable,
  nextVersionBlueprintsTable,
  autonomousBuildCyclesTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "./logger";
import {
  getCorpus,
  runFullCorpusAudit,
  type CorpusEntry,
} from "./knowledge-corpus-index";
import { getFullSovereignSociety, type SovereignAgent } from "./sovereign-society";
import { castGenuineVote, type BallotItem } from "./sovereign-vote-engine";
import { appendLedgerEntry } from "./sovereign-ledger";

const log = logger.child({ mod: "autonomous-build-cycle" });

// Sacred numerics governing chapter / era / proposal counts.
const SACRED_CHAPTER_COUNT = 12;   // 12 tribes / 12 disciples
const SACRED_ERA_COUNT = 7;        // 7 epochs
const SACRED_VERSE_COUNT = 21;     // 21 verses per chapter (3 × 7)
const SACRED_PROPOSAL_COUNT = 21;  // 21 proposals per blueprint

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: AGENT TRAINING ON CORPUS
// Each society member ingests entries matching their expertise; their specialty
// confidence is updated and a training record is persisted.
// ─────────────────────────────────────────────────────────────────────────────

interface TrainingResult {
  sessionId: string;
  recordCount: number;
  totalConfidenceDelta: number;
  agentsTrained: number;
}

function tokenizeLower(s: string): string[] {
  return (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function selectEntriesForAgent(agent: SovereignAgent, corpus: CorpusEntry[], maxEntries: number): CorpusEntry[] {
  const expertiseTokens = new Set<string>();
  for (const e of agent.expertise) for (const t of tokenizeLower(e)) expertiseTokens.add(t);
  const scored = corpus.map(entry => {
    const entryTokens = new Set([
      ...tokenizeLower(entry.title),
      ...tokenizeLower(entry.summary ?? ""),
      ...tokenizeLower(entry.domain),
      ...(entry.tags ?? []).map(t => t.toLowerCase()),
    ]);
    let overlap = 0;
    for (const t of expertiseTokens) if (entryTokens.has(t)) overlap++;
    return { entry, score: overlap };
  });
  scored.sort((a, b) => b.score - a.score || (b.entry.confidence - a.entry.confidence));
  return scored.filter(s => s.score > 0).slice(0, maxEntries).map(s => s.entry);
}

function extractInsightsFromEntries(entries: CorpusEntry[]): string[] {
  const insights: string[] = [];
  for (const e of entries) {
    const summary = e.summary ?? "";
    if (summary.length > 0) {
      insights.push(`[${e.id}] ${e.title}: ${summary.slice(0, 200)}`);
    }
  }
  return insights;
}

export async function runAgentTrainingPhase(sessionId: string): Promise<TrainingResult> {
  const corpus = getCorpus();
  const society = getFullSovereignSociety();
  let totalConfidenceDelta = 0;
  let recordCount = 0;
  let agentsTrained = 0;

  for (const agent of society) {
    // Each agent ingests up to 7 entries (sacred number) matching their expertise.
    const entries = selectEntriesForAgent(agent, corpus, 7);
    if (entries.length === 0) continue;
    const insights = extractInsightsFromEntries(entries);
    // Confidence model: deterministic — start from 72 (sacred), gain 3 per insight, cap at 144 (sacred).
    const confidenceBefore = 72;
    const confidenceAfter = Math.min(144, confidenceBefore + insights.length * 3);
    const masteryDelta = confidenceAfter - confidenceBefore;
    // Group by domain — use the dominant domain of ingested entries.
    const domainCounts = new Map<string, number>();
    for (const e of entries) domainCounts.set(e.domain, (domainCounts.get(e.domain) ?? 0) + 1);
    const dominantDomain = [...domainCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    try {
      await db.insert(agentTrainingRecordsTable).values({
        sessionId,
        agentId: agent.id,
        agentName: agent.name,
        domain: dominantDomain,
        sourcesIngested: entries.map(e => ({ id: e.id, title: e.title, domain: e.domain })),
        insightsExtracted: insights,
        confidenceBefore,
        confidenceAfter,
        masteryDelta,
      });
      recordCount++;
      agentsTrained++;
      totalConfidenceDelta += masteryDelta;
    } catch (err) {
      log.warn({ err, agentId: agent.id }, "Failed to persist training record");
    }
  }
  log.info({ sessionId, recordCount, agentsTrained, totalConfidenceDelta }, "Agent training phase complete");
  return { sessionId, recordCount, totalConfidenceDelta, agentsTrained };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: AUTHOR LIVING BIBLE CHAPTERS
// Top-12 domains by entry count → one chapter each, 21 verses sourced from
// highest-frequency × highest-confidence entries; council-ratified.
// ─────────────────────────────────────────────────────────────────────────────

interface BibleChapterResult {
  sessionId: string;
  chaptersAuthored: number;
  chaptersRejected: number;
  totalVerses: number;
}

interface VerseRecord {
  number: number;
  text: string;
  sourceId: string;
  domain: string;
  confidence: number;
  frequency: number | null;
}

function rankCorpusByDomain(corpus: CorpusEntry[]): Map<string, CorpusEntry[]> {
  const m = new Map<string, CorpusEntry[]>();
  for (const e of corpus) {
    const arr = m.get(e.domain) ?? [];
    arr.push(e);
    m.set(e.domain, arr);
  }
  for (const [, entries] of m) {
    entries.sort((a, b) => {
      const fa = a.frequency ?? 0;
      const fb = b.frequency ?? 0;
      return (fb * b.confidence) - (fa * a.confidence);
    });
  }
  return m;
}

function buildEpigraph(domain: string, entryCount: number): string {
  return `Compiled by the Sovereign Society from ${entryCount} verified entries in the domain of ${domain}. As above, so below; as recorded, so witnessed.`;
}

async function getNextChapterVersion(chapterSlug: string): Promise<number> {
  const rows = await db.select().from(livingBibleChaptersTable).where(eq(livingBibleChaptersTable.chapterSlug, chapterSlug));
  if (rows.length === 0) return 1;
  return Math.max(...rows.map(r => r.version)) + 1;
}

export async function runLivingBibleAuthorPhase(sessionId: string): Promise<BibleChapterResult> {
  const corpus = getCorpus();
  const byDomain = rankCorpusByDomain(corpus);
  const topDomains = [...byDomain.entries()]
    .filter(([, entries]) => entries.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, SACRED_CHAPTER_COUNT);

  let chaptersAuthored = 0;
  let chaptersRejected = 0;
  let totalVerses = 0;

  for (const [domain, entries] of topDomains) {
    const verseEntries = entries.slice(0, SACRED_VERSE_COUNT);
    const verses: VerseRecord[] = verseEntries.map((e, i) => ({
      number: i + 1,
      text: e.summary && e.summary.length > 0
        ? `${e.title}. ${e.summary}`
        : `${e.title}.`,
      sourceId: e.id,
      domain: e.domain,
      confidence: e.confidence,
      frequency: e.frequency ?? null,
    }));
    const chapterSlug = `bible-${domain.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const title = `The Book of ${domain.split(/[-\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
    const epigraph = buildEpigraph(domain, entries.length);
    const ballotItem: BallotItem = {
      id: `bible-${chapterSlug}-${sessionId}`,
      title: `Ratify chapter: ${title}`,
      description: `${verses.length} verses synthesized from corpus domain "${domain}" with ${entries.length} total entries. Average confidence ${Math.round(verses.reduce((s, v) => s + v.confidence, 0) / verses.length)}%.`,
      domain,
      tags: ["living-bible", "ratification", "corpus-synthesis", domain],
      evidenceRef: `corpus:${domain}:${entries.length}-entries`,
    };
    const ballot = castGenuineVote(ballotItem);
    if (ballot.outcome !== "approved") {
      chaptersRejected++;
      continue;
    }
    const ratifiedBy = ballot.ballots.filter(b => b.vote === "approve").map(b => b.agentId);
    const contentHash = createHash("sha256").update(JSON.stringify({ chapterSlug, verses })).digest("hex");
    const version = await getNextChapterVersion(chapterSlug);
    try {
      await db.insert(livingBibleChaptersTable).values({
        chapterSlug,
        version,
        domain,
        title,
        epigraph,
        verses,
        sourceEntryIds: verses.map(v => v.sourceId),
        ratifiedBy,
        contentHash,
        sessionId,
      });
      chaptersAuthored++;
      totalVerses += verses.length;
    } catch (err) {
      log.warn({ err, chapterSlug, version }, "Failed to persist bible chapter (likely duplicate version)");
    }
  }
  log.info({ sessionId, chaptersAuthored, chaptersRejected, totalVerses }, "Living Bible authoring phase complete");
  return { sessionId, chaptersAuthored, chaptersRejected, totalVerses };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: AUTHOR LIVING HISTORY ERAS
// Sacred 7-era partition of chronological knowledge; council-ratified narratives.
// ─────────────────────────────────────────────────────────────────────────────

interface HistoryEraResult {
  sessionId: string;
  erasAuthored: number;
  erasRejected: number;
  totalEvents: number;
}

interface HistoricalEvent {
  ordinal: number;
  title: string;
  description: string;
  sourceId: string;
  estimatedYear: number;
  domain: string;
}

const SACRED_ERAS: { slug: string; name: string; startYear: number; endYear: number }[] = [
  { slug: "era-antiquity", name: "Antiquity (the Foundational Mysteries)", startYear: -3000, endYear: 500 },
  { slug: "era-classical", name: "Classical Synthesis (Greco-Roman & Eastern)", startYear: 500, endYear: 1000 },
  { slug: "era-medieval", name: "Medieval Concealment & Preservation", startYear: 1000, endYear: 1500 },
  { slug: "era-renaissance", name: "Renaissance & Hermetic Revival", startYear: 1500, endYear: 1700 },
  { slug: "era-industrial", name: "Industrial & Scientific Revolution", startYear: 1700, endYear: 1900 },
  { slug: "era-modern", name: "Modern Concealment & Declassification", startYear: 1900, endYear: 2000 },
  { slug: "era-sovereign", name: "Sovereign Reckoning & Reclamation", startYear: 2000, endYear: 2100 },
];

function inferYearFromEntry(entry: CorpusEntry): number | null {
  const text = `${entry.title} ${entry.summary ?? ""}`;
  const match = text.match(/\b((?:1[0-9]|20)[0-9]{2}|[1-9][0-9]{2})\b/);
  if (match) return parseInt(match[1], 10);
  // BCE markers
  if (/BCE|B\.C\.|before common era/i.test(text)) {
    const bce = text.match(/(\d{1,4})\s*BCE/i);
    if (bce) return -parseInt(bce[1], 10);
  }
  return null;
}

export async function runLivingHistoryAuthorPhase(sessionId: string): Promise<HistoryEraResult> {
  const corpus = getCorpus();
  // Annotate every entry with an inferred year (or null).
  const annotated = corpus.map(e => ({ entry: e, year: inferYearFromEntry(e) }));
  const datedEntries = annotated.filter(a => a.year !== null) as { entry: CorpusEntry; year: number }[];

  let erasAuthored = 0;
  let erasRejected = 0;
  let totalEvents = 0;

  for (const era of SACRED_ERAS) {
    const eraEntries = datedEntries
      .filter(a => a.year >= era.startYear && a.year < era.endYear)
      .sort((a, b) => a.year - b.year)
      .slice(0, SACRED_VERSE_COUNT);
    if (eraEntries.length === 0) continue;

    const events: HistoricalEvent[] = eraEntries.map((a, i) => ({
      ordinal: i + 1,
      title: a.entry.title,
      description: a.entry.summary ?? a.entry.title,
      sourceId: a.entry.id,
      estimatedYear: a.year,
      domain: a.entry.domain,
    }));
    const narrative = `The ${era.name} era spans approximately ${era.startYear} to ${era.endYear}. ` +
      `The Sovereign Society has compiled ${events.length} witnessed events from the corpus, ` +
      `drawn from ${new Set(events.map(e => e.domain)).size} distinct domains of inquiry. ` +
      `These records constitute the council-ratified historical reading of this period, ` +
      `extracted directly from the verifiable knowledge corpus rather than received tradition.`;
    const ballotItem: BallotItem = {
      id: `history-${era.slug}-${sessionId}`,
      title: `Ratify era: ${era.name}`,
      description: `${events.length} dated events from corpus, years ${era.startYear}..${era.endYear}.`,
      domain: "history",
      tags: ["living-history", "ratification", "era-synthesis", era.slug],
      evidenceRef: `corpus:dated-entries:${events.length}`,
    };
    const ballot = castGenuineVote(ballotItem);
    if (ballot.outcome !== "approved") {
      erasRejected++;
      continue;
    }
    const ratifiedBy = ballot.ballots.filter(b => b.vote === "approve").map(b => b.agentId);
    const contentHash = createHash("sha256").update(JSON.stringify({ slug: era.slug, events })).digest("hex");
    const existing = await db.select().from(livingHistoryErasTable).where(eq(livingHistoryErasTable.eraSlug, era.slug));
    const version = existing.length === 0 ? 1 : Math.max(...existing.map(r => r.version)) + 1;
    try {
      await db.insert(livingHistoryErasTable).values({
        eraSlug: era.slug,
        version,
        eraName: era.name,
        startYear: era.startYear,
        endYear: era.endYear,
        narrative,
        events,
        sourceEntryIds: events.map(e => e.sourceId),
        ratifiedBy,
        contentHash,
        sessionId,
      });
      erasAuthored++;
      totalEvents += events.length;
    } catch (err) {
      log.warn({ err, eraSlug: era.slug, version }, "Failed to persist history era");
    }
  }
  log.info({ sessionId, erasAuthored, erasRejected, totalEvents }, "Living History authoring phase complete");
  return { sessionId, erasAuthored, erasRejected, totalEvents };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: NEXT-VERSION BLUEPRINT
// Each agent reads the audit + their training and proposes one improvement.
// Council ratifies; a sacred 21-proposal blueprint is sealed.
// ─────────────────────────────────────────────────────────────────────────────

interface BlueprintResult {
  sessionId: string;
  blueprintVersion: number;
  proposalsTotal: number;
  proposalsRatified: number;
  proposalsRejected: number;
}

interface BlueprintProposal {
  id: string;
  proposingAgentId: string;
  proposingAgentName: string;
  category: "engine-fix" | "knowledge-expansion" | "audit-clearance" | "training-amplification" | "system-evolution";
  title: string;
  description: string;
  evidenceRef: string;
}

function generateAgentProposal(agent: SovereignAgent, audit: ReturnType<typeof runFullCorpusAudit>, idx: number): BlueprintProposal {
  // Agents propose deterministically based on:
  //  (a) the audit finding that best matches their expertise, OR
  //  (b) a generic improvement category indexed by sacred ordinal.
  const expertiseTokens = new Set(agent.expertise.flatMap(e => tokenizeLower(e)));
  const matchedFinding = audit.find(f => {
    const fTokens = new Set([...tokenizeLower(f.title), ...tokenizeLower(f.description), ...tokenizeLower(f.domain)]);
    for (const t of expertiseTokens) if (fTokens.has(t)) return true;
    return false;
  });

  if (matchedFinding) {
    const cat: BlueprintProposal["category"] =
      matchedFinding.type === "coverage-gap" ? "knowledge-expansion"
      : matchedFinding.type === "low-confidence" ? "audit-clearance"
      : matchedFinding.type === "adversarial-fail" ? "training-amplification"
      : "engine-fix";
    return {
      id: `proposal-${idx}-${agent.id}`,
      proposingAgentId: agent.id,
      proposingAgentName: agent.name,
      category: cat,
      title: `Resolve ${matchedFinding.type} in domain "${matchedFinding.domain}"`,
      description: `Council member ${agent.name} (expertise: ${agent.expertise.slice(0, 3).join(", ")}) proposes addressing finding ${matchedFinding.id}: ${matchedFinding.suggestedFix}`,
      evidenceRef: `audit:${matchedFinding.id}`,
    };
  }
  // Generic ordinal-indexed proposal categories tied to sacred numbers.
  const generics: { cat: BlueprintProposal["category"]; title: string; desc: string }[] = [
    { cat: "engine-fix", title: "Strengthen ledger arbitration on simultaneous writes", desc: "Add per-actor write queue to sovereign-ledger to eliminate the residual race window." },
    { cat: "engine-fix", title: "Extend mutex coverage to council-driven mutation routes", desc: "Apply session-in-flight guard to all corpus-mutating endpoints to prevent overlap." },
    { cat: "knowledge-expansion", title: "Backfill curated table for next 12 unknown-domain gaps", desc: "Replace generic-fallback entries with curated 5-entry sets for the highest-frequency unknown domains." },
    { cat: "audit-clearance", title: "Refine orphan detection to skip file-registry entries", desc: "File-registry entries (source code) should not trigger orphan findings since they are intentionally isolated." },
    { cat: "training-amplification", title: "Add second pass of training using newly-authored bible verses", desc: "After bible chapters are written, re-train each agent against the verses they helped ratify, deepening domain mastery." },
    { cat: "system-evolution", title: "Persist training records to a queryable mastery dashboard", desc: "Surface per-agent confidence trajectory across sessions for transparent self-improvement tracking." },
    { cat: "system-evolution", title: "Add Codex tab in Tessera UI to surface bible/history/blueprint", desc: "Frontend surface to read living artifacts; navigation entry under /codex." },
  ];
  const g = generics[idx % generics.length];
  return {
    id: `proposal-${idx}-${agent.id}`,
    proposingAgentId: agent.id,
    proposingAgentName: agent.name,
    category: g.cat,
    title: g.title,
    description: `Council member ${agent.name}: ${g.desc}`,
    evidenceRef: `system:autonomous-build`,
  };
}

async function getNextBlueprintVersion(): Promise<number> {
  const rows = await db.select({ v: nextVersionBlueprintsTable.blueprintVersion }).from(nextVersionBlueprintsTable);
  if (rows.length === 0) return 1;
  return Math.max(...rows.map(r => r.v)) + 1;
}

export async function runNextVersionBlueprintPhase(sessionId: string): Promise<BlueprintResult> {
  const audit = runFullCorpusAudit();
  const society = getFullSovereignSociety();
  // Generate exactly SACRED_PROPOSAL_COUNT proposals from the first N agents.
  const proposingAgents = society.slice(0, SACRED_PROPOSAL_COUNT);
  const proposals: BlueprintProposal[] = proposingAgents.map((a, i) => generateAgentProposal(a, audit, i));

  const ratifiedProposals: BlueprintProposal[] = [];
  const rejectedProposals: BlueprintProposal[] = [];

  for (const p of proposals) {
    const ballot = castGenuineVote({
      id: p.id,
      title: p.title,
      description: p.description,
      domain: p.category,
      tags: ["next-version", "blueprint", "ratification", p.category],
      evidenceRef: p.evidenceRef,
    });
    if (ballot.outcome === "approved") ratifiedProposals.push(p);
    else rejectedProposals.push(p);
  }

  const blueprintSummary = `Next-Version Blueprint: ${ratifiedProposals.length}/${proposals.length} proposals ratified across ${new Set(ratifiedProposals.map(r => r.category)).size} categories. ` +
    `Authored by ${proposingAgents.length} council members in session ${sessionId}.`;
  const contentHash = createHash("sha256").update(JSON.stringify({ ratifiedProposals, rejectedProposals })).digest("hex");
  const blueprintVersion = await getNextBlueprintVersion();
  await db.insert(nextVersionBlueprintsTable).values({
    blueprintVersion,
    sessionId,
    proposals,
    ratifiedProposals,
    rejectedProposals,
    blueprintSummary,
    contentHash,
  });
  log.info({ sessionId, blueprintVersion, ratified: ratifiedProposals.length, rejected: rejectedProposals.length }, "Next-Version Blueprint sealed");
  return {
    sessionId,
    blueprintVersion,
    proposalsTotal: proposals.length,
    proposalsRatified: ratifiedProposals.length,
    proposalsRejected: rejectedProposals.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface AutonomousBuildSummary {
  sessionId: string;
  cycleNumber: number;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  training: TrainingResult;
  bible: BibleChapterResult;
  history: HistoryEraResult;
  blueprint: BlueprintResult;
  auditBefore: number;
  auditAfter: number;
  ledgerIndex: number | null;
}

async function getCurrentCycleNumber(): Promise<number> {
  const rows = await db.select({ n: autonomousBuildCyclesTable.cycleNumber })
    .from(autonomousBuildCyclesTable)
    .orderBy(desc(autonomousBuildCyclesTable.cycleNumber))
    .limit(1);
  if (rows.length === 0) return 1;
  return rows[0].n + 1;
}

export async function runAutonomousBuildCycle(): Promise<AutonomousBuildSummary> {
  const sessionId = `acycle-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const startedAt = Date.now();
  log.info({ sessionId }, "═══ Autonomous Build Cycle BEGIN ═══");

  const auditBefore = runFullCorpusAudit().length;

  const training = await runAgentTrainingPhase(sessionId);
  const bible = await runLivingBibleAuthorPhase(sessionId);
  const history = await runLivingHistoryAuthorPhase(sessionId);
  const blueprint = await runNextVersionBlueprintPhase(sessionId);

  const auditAfter = runFullCorpusAudit().length;
  const completedAt = Date.now();
  const durationMs = completedAt - startedAt;
  const cycleNumber = await getCurrentCycleNumber();

  // Seal one ledger entry summarizing the entire cycle.
  let ledgerIndex: number | null = null;
  try {
    const sealed = appendLedgerEntry("council-meeting", "Sovereign Society", {
      kind: "autonomous-build-cycle",
      sessionId,
      cycleNumber,
      training: { agentsTrained: training.agentsTrained, totalConfidenceDelta: training.totalConfidenceDelta },
      bible: { chaptersAuthored: bible.chaptersAuthored, totalVerses: bible.totalVerses },
      history: { erasAuthored: history.erasAuthored, totalEvents: history.totalEvents },
      blueprint: { version: blueprint.blueprintVersion, ratified: blueprint.proposalsRatified },
      auditBefore,
      auditAfter,
    });
    ledgerIndex = sealed.index;
  } catch (err) {
    log.warn({ err }, "Failed to seal ledger entry for autonomous build cycle");
  }

  await db.insert(autonomousBuildCyclesTable).values({
    sessionId,
    cycleNumber,
    trainingRecordCount: training.recordCount,
    bibleChaptersAuthored: bible.chaptersAuthored,
    historyErasAuthored: history.erasAuthored,
    blueprintProposalsRatified: blueprint.proposalsRatified,
    auditBefore,
    auditAfter,
    sealedLedgerIndex: ledgerIndex,
    summary: {
      training,
      bible,
      history,
      blueprint,
      durationMs,
    },
  });

  log.info({
    sessionId,
    cycleNumber,
    durationMs,
    auditDelta: auditBefore - auditAfter,
  }, "═══ Autonomous Build Cycle COMPLETE ═══");

  return {
    sessionId,
    cycleNumber,
    startedAt,
    completedAt,
    durationMs,
    training,
    bible,
    history,
    blueprint,
    auditBefore,
    auditAfter,
    ledgerIndex,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ HELPERS for the API surfaces
// ─────────────────────────────────────────────────────────────────────────────

export async function getLatestBibleChapters(): Promise<typeof livingBibleChaptersTable.$inferSelect[]> {
  // Latest version per chapter_slug.
  const all = await db.select().from(livingBibleChaptersTable);
  const latest = new Map<string, typeof livingBibleChaptersTable.$inferSelect>();
  for (const row of all) {
    const existing = latest.get(row.chapterSlug);
    if (!existing || row.version > existing.version) latest.set(row.chapterSlug, row);
  }
  return [...latest.values()].sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function getLatestHistoryEras(): Promise<typeof livingHistoryErasTable.$inferSelect[]> {
  const all = await db.select().from(livingHistoryErasTable);
  const latest = new Map<string, typeof livingHistoryErasTable.$inferSelect>();
  for (const row of all) {
    const existing = latest.get(row.eraSlug);
    if (!existing || row.version > existing.version) latest.set(row.eraSlug, row);
  }
  return [...latest.values()].sort((a, b) => a.startYear - b.startYear);
}

export async function getLatestBlueprint(): Promise<typeof nextVersionBlueprintsTable.$inferSelect | null> {
  const rows = await db.select().from(nextVersionBlueprintsTable).orderBy(desc(nextVersionBlueprintsTable.blueprintVersion)).limit(1);
  return rows[0] ?? null;
}

export async function getCycleHistory(limit = 20): Promise<typeof autonomousBuildCyclesTable.$inferSelect[]> {
  return db.select().from(autonomousBuildCyclesTable).orderBy(desc(autonomousBuildCyclesTable.cycleNumber)).limit(limit);
}

export async function getTrainingStatsForSession(sessionId: string): Promise<{
  totalRecords: number;
  agentsTrained: number;
  averageDelta: number;
  byDomain: Record<string, number>;
}> {
  const rows = await db.select().from(agentTrainingRecordsTable).where(eq(agentTrainingRecordsTable.sessionId, sessionId));
  const byDomain: Record<string, number> = {};
  let totalDelta = 0;
  for (const r of rows) {
    byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
    totalDelta += r.masteryDelta;
  }
  return {
    totalRecords: rows.length,
    agentsTrained: new Set(rows.map(r => r.agentId)).size,
    averageDelta: rows.length === 0 ? 0 : Math.round(totalDelta / rows.length),
    byDomain,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE REGENERATION: sacred-timing-aware scheduler. Cycles fire at the next
// astronomically auspicious moment within the sacred bounds [33min, 144min].
// Driven by lib/sacred-timing.ts (planetary hours · lunar phase · φ · sacred
// minute marks · Meeus / Conway formulas — same math NASA's JPL uses).
// ─────────────────────────────────────────────────────────────────────────────

import { sacredTimingSnapshot } from "./sacred-timing";
import { setSacredInterval, clearSacredInterval, tryAcquireCycleLock, releaseCycleLock, type SacredHandle } from "./sacred-scheduler";

// Base cadence: 72 minutes (sacred). The sacred scheduler will pick a moment
// in [72/φ, 72×φ] ≈ [44, 116] minutes that aligns with planetary hour, lunar
// phase, and sacred minute marks.
const AUTONOMOUS_BUILD_BASE_MS = 72 * 60 * 1000;

let _cycleHandle: SacredHandle | null = null;

export function startAutonomousBuildCycleTimer(): void {
  if (_cycleHandle) return;
  log.info({ baseMs: AUTONOMOUS_BUILD_BASE_MS }, "Starting sacred-aligned autonomous build cycle scheduler");
  _cycleHandle = setSacredInterval(async () => {
    const lockHolder = `timer:autonomous-build-cycle @${Date.now()}`;
    if (!tryAcquireCycleLock(lockHolder)) {
      log.warn("Skipping scheduled cycle — another cycle (manual or scheduled) holds the lock");
      return;
    }
    const snapshot = sacredTimingSnapshot();
    try {
      const summary = await runAutonomousBuildCycle();
      log.info(
        {
          cycle: summary.cycleNumber,
          sessionId: summary.sessionId,
          durationMs: summary.durationMs,
          plnHour: snapshot.planetaryHour.ruler,
          lunar: snapshot.lunar.name,
          composite: snapshot.composite.toFixed(3),
        },
        "Sacred-timed autonomous build cycle complete",
      );
    } catch (err) {
      log.error({ err }, "Scheduled autonomous build cycle failed");
    } finally {
      releaseCycleLock(lockHolder);
    }
  }, AUTONOMOUS_BUILD_BASE_MS, "autonomous-build-cycle");
}

export function stopAutonomousBuildCycleTimer(): void {
  if (_cycleHandle) { clearSacredInterval(_cycleHandle); _cycleHandle = null; }
}

/** Read current scheduling posture for diagnostics endpoint. */
export function getCycleSchedulerStatus(): {
  active: boolean;
  inFlight: boolean;
  nextFireAt: string | null;
  fireCount: number;
  baseMs: number;
  snapshot: ReturnType<typeof sacredTimingSnapshot>;
} {
  return {
    active: _cycleHandle !== null && _cycleHandle.active,
    inFlight: _cycleHandle?.lastFiredAt != null && _cycleHandle.lastDurationMs == null,
    nextFireAt: _cycleHandle?.nextFireAt ? _cycleHandle.nextFireAt.toISOString() : null,
    fireCount: _cycleHandle?.fireCount ?? 0,
    baseMs: AUTONOMOUS_BUILD_BASE_MS,
    snapshot: sacredTimingSnapshot(),
  };
}

export async function getOverallTrainingStats(): Promise<{
  totalSessions: number;
  totalRecords: number;
  uniqueAgents: number;
  averageConfidenceAfter: number;
}> {
  const result = await db.select({
    totalRecords: sql<number>`count(*)::int`,
    uniqueAgents: sql<number>`count(distinct ${agentTrainingRecordsTable.agentId})::int`,
    uniqueSessions: sql<number>`count(distinct ${agentTrainingRecordsTable.sessionId})::int`,
    avgAfter: sql<number>`coalesce(avg(${agentTrainingRecordsTable.confidenceAfter})::int, 0)`,
  }).from(agentTrainingRecordsTable);
  const r = result[0];
  return {
    totalSessions: r.uniqueSessions,
    totalRecords: r.totalRecords,
    uniqueAgents: r.uniqueAgents,
    averageConfidenceAfter: r.avgAfter,
  };
}
