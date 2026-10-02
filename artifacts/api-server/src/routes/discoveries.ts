import { Router } from "express";
import { logger } from "../lib/logger";
import { solveProblem, getRecentlySolvedProblems, getSolvedProblemById, getSolvedProblemStats } from "../lib/problem-solver";
import { fetchClayMillenniumProblems, fetchProjectEuler } from "../lib/ingestion/problem-sources";

const router = Router();

router.get("/discoveries", async (_req, res) => {
  try {
    const recent = getRecentlySolvedProblems(20);
    const stats = getSolvedProblemStats();

    return res.json({
      ok: true,
      discoveries: recent.map(p => ({
        id: p.id,
        problemTitle: p.problemTitle,
        domain: p.domain,
        source: p.source,
        url: p.url,
        finalAnswer: p.finalAnswer,
        plainEnglishExplanation: p.plainEnglishExplanation,
        connections: p.connections,
        agentsInvolved: p.attempts.map(a => a.agentName),
        consensusReached: p.deliberation.consensusReached,
        approvalRate: p.deliberation.approvalRate,
        winningSolver: p.deliberation.winningSolution?.agentName ?? null,
        confidence: p.deliberation.winningSolution?.confidence ?? 0,
        solvedAt: p.solvedAt.toISOString(),
        workStepsCount: p.deliberation.winningSolution?.workShown.length ?? 0,
      })),
      stats,
    });
  } catch (err) {
    logger.error({ err }, "GET /discoveries failed");
    return res.status(500).json({ error: "Failed to get discoveries", details: String(err) });
  }
});

router.get("/discoveries/:id", async (req, res) => {
  try {
    const problem = getSolvedProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: "Discovery not found" });
    }

    return res.json({
      ok: true,
      discovery: {
        id: problem.id,
        problemTitle: problem.problemTitle,
        problemContent: problem.problemContent,
        domain: problem.domain,
        source: problem.source,
        url: problem.url,
        finalAnswer: problem.finalAnswer,
        plainEnglishExplanation: problem.plainEnglishExplanation,
        connections: problem.connections,
        solvedAt: problem.solvedAt.toISOString(),
        attempts: problem.attempts.map(a => ({
          agentId: a.agentId,
          agentName: a.agentName,
          approach: a.approach,
          workShown: a.workShown,
          answer: a.answer,
          confidence: a.confidence,
          plainEnglish: a.plainEnglish,
          reasoningTrace: a.reasoningTrace,
        })),
        deliberation: {
          consensusReached: problem.deliberation.consensusReached,
          approvalRate: problem.deliberation.approvalRate,
          transcript: problem.deliberation.transcript,
          voteTally: problem.deliberation.voteTally,
          winningSolution: problem.deliberation.winningSolution ? {
            agentName: problem.deliberation.winningSolution.agentName,
            confidence: problem.deliberation.winningSolution.confidence,
          } : null,
        },
      },
    });
  } catch (err) {
    logger.error({ err, id: req.params.id }, "GET /discoveries/:id failed");
    return res.status(500).json({ error: "Failed to get discovery", details: String(err) });
  }
});

router.post("/discoveries/solve", async (req, res) => {
  try {
    const { title, content, source, url, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }

    const solved = await solveProblem({
      title,
      content,
      source: source || "user-submission",
      url,
      tags: tags || [],
    });

    return res.json({
      ok: true,
      discovery: {
        id: solved.id,
        problemTitle: solved.problemTitle,
        domain: solved.domain,
        finalAnswer: solved.finalAnswer,
        plainEnglishExplanation: solved.plainEnglishExplanation,
        agentsInvolved: solved.attempts.map(a => a.agentName),
        consensusReached: solved.deliberation.consensusReached,
        approvalRate: solved.deliberation.approvalRate,
        confidence: solved.deliberation.winningSolution?.confidence ?? 0,
        solvedAt: solved.solvedAt.toISOString(),
        workShown: solved.deliberation.winningSolution?.workShown ?? [],
        reasoningTrace: solved.deliberation.winningSolution?.reasoningTrace ?? [],
        deliberationTranscript: solved.deliberation.transcript,
        connections: solved.connections,
      },
    });
  } catch (err) {
    logger.error({ err }, "POST /discoveries/solve failed");
    return res.status(500).json({ error: "Failed to solve problem", details: String(err) });
  }
});

router.post("/discoveries/seed-problems", async (_req, res) => {
  try {
    const clayProblems = await fetchClayMillenniumProblems();
    const eulerProblems = await fetchProjectEuler();
    const allProblems = [...eulerProblems.slice(0, 3), ...clayProblems.slice(0, 2)];

    const results = [];
    for (const prob of allProblems) {
      try {
        const solved = await solveProblem({
          title: prob.title || "Untitled",
          content: prob.content,
          source: prob.source,
          url: prob.url,
          tags: (prob.tags || []) as string[],
        });
        results.push({ id: solved.id, title: solved.problemTitle, domain: solved.domain });
      } catch (err) {
        logger.warn({ err, title: prob.title }, "Failed to solve seeded problem");
      }
    }

    return res.json({ ok: true, seeded: results.length, problems: results });
  } catch (err) {
    logger.error({ err }, "POST /discoveries/seed-problems failed");
    return res.status(500).json({ error: "Failed to seed problems", details: String(err) });
  }
});

export default router;
