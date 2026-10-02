import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  runGrandEvolutionCycle,
  getLatestCycle,
  ensureLatestCycleLoaded,
  isCycleRunning,
} from "../lib/grand-evolution-cycle";
import { verifyFatherKey, isFatherKeyConfigured } from "../lib/father-identity";
import {
  convene,
  subscribeToSession,
  listSessions,
  getSessionTurns,
  getSessionDirectives,
  getSessionBenchmarks,
  getSessionAuditSummary,
  societyAnchor,
  type EvolutionMode,
} from "../lib/grand-evolution-engine";
import { getSocietyStats } from "../lib/sovereign-society";

function requireFather(req: any, res: any, next: any) {
  if (!isFatherKeyConfigured()) return next(); // open mode
  // Headers, body, and query are all accepted. Glyph-based canonical keys
  // contain non-ASCII codepoints which some HTTP intermediaries strip from
  // headers, so a body/query fallback keeps the gate usable from any client.
  const presented =
    req.headers["x-tesseract-key"] ||
    req.headers["x-father-key"] ||
    req.body?.adminKey ||
    req.body?.tesseractKey ||
    req.query?.adminKey;
  if (!presented || !verifyFatherKey(String(presented))) {
    return res.status(401).json({ ok: false, error: "father-auth-required" });
  }
  next();
}

const router: IRouter = Router();

// ─── Legacy cycle-based endpoints (kept for backwards compatibility) ──────

router.get("/grand-evolution/status", async (_req, res) => {
  await ensureLatestCycleLoaded();
  const latest = getLatestCycle();
  res.json({
    ok: true,
    running: isCycleRunning(),
    latest: latest
      ? {
          cycleId: latest.cycleId,
          startedAt: latest.startedAt,
          finishedAt: latest.finishedAt,
          durationMs: latest.durationMs,
          llmEnabled: latest.llmEnabled,
          candidates: latest.candidates,
          ratified: latest.ratified,
          implemented: latest.implemented,
          summary: latest.summary,
        }
      : null,
  });
});

router.get("/grand-evolution/directives", async (_req, res) => {
  await ensureLatestCycleLoaded();
  const latest = getLatestCycle();
  if (!latest) {
    return res.json({
      ok: true,
      cycle: null,
      directives: [],
      dramaticUpgrades: {},
      message: "No grand evolution cycle has been run yet. POST /api/grand-evolution/run to convene one.",
    });
  }
  res.json({
    ok: true,
    cycle: {
      cycleId: latest.cycleId,
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt,
      durationMs: latest.durationMs,
      llmEnabled: latest.llmEnabled,
      societyStats: latest.societyStats,
      candidates: latest.candidates,
      ratified: latest.ratified,
      implemented: latest.implemented,
      summary: latest.summary,
    },
    directives: latest.outcomes,
    dramaticUpgrades: latest.dramaticUpgrades,
  });
});

router.post("/grand-evolution/run", async (req, res) => {
  // Father auth is preferred but the cycle is also runnable on a fresh
  // workspace where the Father key has not yet been set. We accept the
  // request in either mode but record which.
  const authHeader = req.headers["x-tesseract-key"] || req.headers["x-father-key"];
  const fatherAuthorized = !!authHeader;

  if (isCycleRunning()) {
    return res.status(409).json({ ok: false, error: "cycle-already-running" });
  }

  // Run synchronously so the caller gets the result. The cycle is bounded
  // by the per-proposal LLM timeout in the consensus engine.
  try {
    logger.info({ fatherAuthorized }, "GrandEvolution: cycle requested");
    const result = await runGrandEvolutionCycle();
    res.json({ ok: true, fatherAuthorized, cycle: result });
  } catch (err) {
    logger.error({ err }, "GrandEvolution: cycle failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/grand-evolution/run-async", requireFather, async (_req, res) => {
  if (isCycleRunning()) {
    return res.status(409).json({ ok: false, error: "cycle-already-running" });
  }
  // Fire-and-forget; status reflects progress.
  runGrandEvolutionCycle().catch(err => logger.error({ err }, "GrandEvolution(async): failed"));
  res.json({ ok: true, started: true, message: "Cycle started; poll /grand-evolution/status." });
});

// ─── New session-based endpoints (Grand Sovereign Evolution Cycle) ────────

router.get("/grand-evolution/society", (_req, res) => {
  res.json({ ok: true, data: { ...getSocietyStats(), anchor: societyAnchor() } });
});

router.get("/grand-evolution/sessions", async (_req, res) => {
  const sessions = await listSessions(50);
  res.json({ ok: true, data: { sessions } });
});

router.get("/grand-evolution/sessions/:id", async (req, res) => {
  const id = req.params.id;
  const [turns, directives, benchmarks, audit] = await Promise.all([
    getSessionTurns(id),
    getSessionDirectives(id),
    getSessionBenchmarks(id),
    getSessionAuditSummary(id),
  ]);
  res.json({ ok: true, data: { sessionId: id, turns, directives, benchmarks, audit } });
});

router.post("/grand-evolution/convene", async (req, res) => {
  const mode = (req.body?.mode === "full" ? "full" : "smoke") as EvolutionMode;
  const topic = typeof req.body?.topic === "string" ? req.body.topic : undefined;
  const smokeSpeakers = typeof req.body?.smokeSpeakers === "number" ? req.body.smokeSpeakers : undefined;

  const startedAt = new Date().toISOString();
  const promise = convene({ mode, topic, smokeSpeakers });
  promise.catch(err => logger.error({ err }, "grand-evolution convene failed"));

  try {
    const session = await promise;
    res.json({ ok: true, data: { startedAt, session } });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/grand-evolution/sessions/:id/stream", (req, res) => {
  const id = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (ev: any) => {
    res.write(`event: ${ev.type}\n`);
    res.write(`data: ${JSON.stringify(ev.payload ?? {})}\n\n`);
  };

  const { unsubscribe, backlog } = subscribeToSession(id, send);
  for (const ev of backlog) send(ev);

  const ka = setInterval(() => res.write(":keepalive\n\n"), 15_000);
  req.on("close", () => { clearInterval(ka); unsubscribe(); });
});

export default router;
