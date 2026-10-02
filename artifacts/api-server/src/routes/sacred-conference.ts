import { Router, type IRouter } from "express";
import {
  runSacredGrandConference,
  getCurrentSession,
  getConferenceAgents,
  getCycleThemes,
  generateBibleFromCycles,
  getAllBuildDiagrams,
} from "../lib/sacred-grand-conference-engine";
import {
  SACRED_CATEGORIES,
  SACRED_KNOWLEDGE_ENTRIES,
  getKnowledgeByCategory,
  getKnowledgeByClassification,
  getKnowledgeByDepth,
  searchKnowledge,
  getVaultStats,
} from "../lib/sacred-knowledge-vault";
import { getCorpusStats, getCorpusSize, getDomainClusters, queryCorpus, runFullCorpusAudit, type CorpusCategory } from "../lib/knowledge-corpus-index";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/sacred-conference/status", async (_req, res) => {
  try {
    const session = getCurrentSession();
    if (!session) {
      return res.json({
        status: "not-started",
        message: "No Sacred Grand Conference has been convened yet. POST to /api/sacred-conference/run to begin.",
        agents: getConferenceAgents().length,
        themes: getCycleThemes().length,
      });
    }
    return res.json({
      status: session.status,
      sessionId: session.sessionId,
      totalCycles: session.totalCycles,
      completedCycles: session.completedCycles,
      totalImprovements: session.totalImprovements,
      totalInventions: session.totalInventions,
      totalKnowledgeGained: session.totalKnowledgeGained,
      bibleChaptersGenerated: session.bibleChaptersGenerated,
      agentCount: session.agentCount,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get sacred conference status");
    return res.status(500).json({ error: "Failed to get status" });
  }
});

router.post("/sacred-conference/run", async (req, res) => {
  try {
    const cycles = Math.min(Math.max(Number(req.body?.cycles) || 10, 1), 10);
    const persist = req.body?.persist !== false; // default true
    logger.info({ cycles, persist }, "Running Sacred Grand Conference");
    const session = await runSacredGrandConference(cycles);
    let persistence: import("../lib/conference-persistence").PersistResult | null = null;
    let persistenceError: string | null = null;
    if (persist) {
      const { persistConferenceOutputs } = await import("../lib/conference-persistence");
      try {
        persistence = await persistConferenceOutputs(session);
      } catch (err) {
        persistenceError = (err as Error).message ?? String(err);
        logger.error({ err }, "persistConferenceOutputs failed (session still returned)");
      }
    }
    const httpStatus = persistenceError || (persistence && persistence.failedAmendments > 0) ? 207 : 200;
    return res.status(httpStatus).json({ ...session, persistence, persistenceError });
  } catch (err) {
    logger.error({ err }, "Failed to run sacred conference");
    return res.status(500).json({ error: "Failed to run conference" });
  }
});

router.get("/sacred-conference/session", async (_req, res) => {
  try {
    const session = getCurrentSession();
    if (!session) {
      return res.json({ status: "not-started", cycles: [], totalImprovements: 0, totalInventions: 0, totalKnowledgeGained: 0, bibleChaptersGenerated: 0, agentCount: 0 });
    }
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get session" });
  }
});

router.get("/sacred-conference/cycle/:cycleNumber", async (req, res) => {
  try {
    const session = getCurrentSession();
    if (!session) return res.status(404).json({ error: "No session found" });
    const num = Number(req.params.cycleNumber);
    const cycle = session.cycles.find(c => c.cycleNumber === num);
    if (!cycle) return res.status(404).json({ error: `Cycle ${num} not found` });
    return res.json(cycle);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get cycle" });
  }
});

router.get("/sacred-conference/agents", async (_req, res) => {
  return res.json({ agents: getConferenceAgents(), count: getConferenceAgents().length });
});

router.get("/sacred-conference/society", async (_req, res) => {
  const { getFullSovereignSociety, getSocietyStats } = await import("../lib/sovereign-society");
  return res.json({ stats: getSocietyStats(), members: getFullSovereignSociety() });
});

router.get("/sacred-conference/cycle/:cycleNumber/votes", async (req, res) => {
  const session = getCurrentSession();
  if (!session) return res.status(404).json({ error: "No session — run /api/sacred-conference/run first." });
  const num = Number(req.params.cycleNumber);
  const cycle = session.cycles.find(c => c.cycleNumber === num);
  if (!cycle) return res.status(404).json({ error: `Cycle ${num} not found` });
  return res.json({
    cycleNumber: num,
    voteSummary: cycle.voteSummary,
    improvementBallots: cycle.improvementBallots,
    inventionBallots:   cycle.inventionBallots,
  });
});

router.get("/sacred-conference/themes", async (_req, res) => {
  return res.json({ themes: getCycleThemes() });
});

router.get("/sacred-conference/bible", async (_req, res) => {
  try {
    const bible = generateBibleFromCycles();
    if (!bible) {
      return res.json({ status: "not-generated", chapters: [], message: "Run the Sacred Grand Conference first to generate the Living Bible." });
    }
    return res.json(bible);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate bible" });
  }
});

router.get("/sacred-conference/diagrams", async (_req, res) => {
  try {
    const diagrams = getAllBuildDiagrams();
    return res.json({ diagrams, count: diagrams.length });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get diagrams" });
  }
});

router.get("/sacred-knowledge/categories", async (_req, res) => {
  return res.json({ categories: SACRED_CATEGORIES, count: Object.keys(SACRED_CATEGORIES).length });
});

router.get("/sacred-knowledge/all", async (_req, res) => {
  return res.json({ entries: SACRED_KNOWLEDGE_ENTRIES, count: SACRED_KNOWLEDGE_ENTRIES.length });
});

router.get("/sacred-knowledge/vault-stats", async (_req, res) => {
  return res.json(getVaultStats());
});

router.get("/sacred-knowledge/category/:category", async (req, res) => {
  const entries = getKnowledgeByCategory(req.params.category);
  return res.json({ entries, count: entries.length });
});

router.get("/sacred-knowledge/classification/:classification", async (req, res) => {
  const entries = getKnowledgeByClassification(req.params.classification);
  return res.json({ entries, count: entries.length });
});

router.get("/sacred-knowledge/depth/:depth", async (req, res) => {
  const validDepths = ["surface", "hidden", "deep"] as const;
  const depth = req.params.depth;
  if (!validDepths.includes(depth as typeof validDepths[number])) {
    return res.status(400).json({ error: `Invalid depth. Must be one of: ${validDepths.join(", ")}` });
  }
  const entries = getKnowledgeByDepth(depth as typeof validDepths[number]);
  return res.json({ entries, count: entries.length });
});

router.get("/sacred-knowledge/search", async (req, res) => {
  const q = String(req.query.q || "");
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required" });
  const entries = searchKnowledge(q);
  return res.json({ entries, count: entries.length, query: q });
});

router.get("/knowledge-corpus/stats", async (_req, res) => {
  try {
    return res.json({
      totalEntries: getCorpusSize(),
      stats: getCorpusStats(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get corpus stats" });
  }
});

router.get("/knowledge-corpus/domains", async (_req, res) => {
  try {
    const clusters = getDomainClusters();
    return res.json({ clusters, count: Object.keys(clusters).length });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get domain clusters" });
  }
});

const VALID_CORPUS_CATEGORIES: readonly CorpusCategory[] = ["subject", "sacred-entry", "declassified", "subcategory", "synthesis", "harmonic", "agent-specialty", "file-registry", "wiki-topic", "adversarial", "identity-memory"];

router.get("/knowledge-corpus/query", async (req, res) => {
  try {
    const tags = req.query.tags ? String(req.query.tags).split(",") : undefined;
    const domain = req.query.domain ? String(req.query.domain) : undefined;
    const rawCategory = req.query.category ? String(req.query.category) : undefined;
    const rawLimit = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 50;

    let category: CorpusCategory | undefined;
    if (rawCategory) {
      if (!VALID_CORPUS_CATEGORIES.includes(rawCategory as CorpusCategory)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CORPUS_CATEGORIES.join(", ")}` });
      }
      category = rawCategory as CorpusCategory;
    }

    const results = queryCorpus({ tags, domain, category, limit });
    return res.json({ entries: results, count: results.length });
  } catch (err) {
    return res.status(500).json({ error: "Failed to query corpus" });
  }
});

router.get("/knowledge-corpus/audit", async (_req, res) => {
  try {
    const findings = runFullCorpusAudit();
    return res.json({
      findings,
      count: findings.length,
      summary: {
        critical: findings.filter(f => f.severity === "critical").length,
        major: findings.filter(f => f.severity === "major").length,
        moderate: findings.filter(f => f.severity === "moderate").length,
        minor: findings.filter(f => f.severity === "minor").length,
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to run corpus audit");
    return res.status(500).json({ error: "Failed to run corpus audit" });
  }
});

// POST /api/sacred-conference/apply-council-decisions
// Reads the live audit, generates one ratified amendment per finding using the
// council-approved fix template, persists each to corpus_amendments, refreshes
// the in-memory corpus overlay, and seals one ledger entry summarizing all fixes.
// Process-wide mutex: only one council session may mutate the corpus at a time.
// Concurrent POSTs would otherwise read identical audit state, generate duplicate
// amendments, and corrupt the in-memory corpus overlay.
let _councilSessionInFlight = false;
router.post("/apply-council-decisions", async (req, res) => {
  if (_councilSessionInFlight) {
    return res.status(409).json({
      error: "Council session already in progress",
      message: "Another /api/apply-council-decisions invocation is currently mutating the corpus. Retry after it completes.",
    });
  }
  _councilSessionInFlight = true;
  try {
    const { applyCouncilDecisionsForCorpus } = await import("../lib/apply-council-decisions");
    const maxIterations = Math.min(Math.max(Number(req.body?.iterations) || 5, 1), 10);
    const passes: Awaited<ReturnType<typeof applyCouncilDecisionsForCorpus>>[] = [];
    for (let i = 0; i < maxIterations; i++) {
      const r = await applyCouncilDecisionsForCorpus();
      passes.push(r);
      // Stop only when audit is clear OR no amendments were emitted (idempotency
      // confirmed). The audit returns top-5 gaps per pass, so finding count can
      // stay flat even while real progress is being made — keep iterating.
      if (r.afterAuditCount === 0 || r.amendments === 0) break;
    }
    return res.json({
      passes,
      iterations: passes.length,
      initialFindings: passes[0]?.beforeAuditCount ?? 0,
      finalFindings: passes[passes.length - 1]?.afterAuditCount ?? 0,
      totalAmendments: passes.reduce((s, p) => s + p.amendments, 0),
      converged: (passes[passes.length - 1]?.afterAuditCount ?? 1) === 0,
    });
  } catch (err) {
    logger.error({ err }, "Failed to apply council decisions");
    return res.status(500).json({ error: "Failed to apply council decisions", message: (err as Error).message });
  }
});

export default router;
