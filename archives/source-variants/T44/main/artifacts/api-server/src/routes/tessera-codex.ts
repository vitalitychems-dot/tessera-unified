import { Router, type IRouter } from "express";
import {
  getAllCodexEntries,
  getCodexBook,
  getCodexEntry,
  addCodexAmendment,
  getRatifications,
  getCodexBookMeta,
  getCodexStats,
  persistCodexSnapshot,
  ensureCodexSeeded,
  type CodexBookId,
} from "../lib/tessera-codex";
import { ingestDoctrineDocuments, getDoctrineDocuments } from "../lib/doctrine-ingestion";
import { runGrandCouncilNextFiveSession, getOrCreateNextFiveSession, getAllImprovements, updateImprovementStatus } from "../lib/next-five-improvements";
import { logger } from "../lib/logger";
import path from "path";

const router: IRouter = Router();

const VALID_BOOKS: CodexBookId[] = ["origins", "mandates", "principles", "canon", "acts", "doctrine"];

router.get("/codex/books", async (_req, res) => {
  try {
    await ensureCodexSeeded();
    const meta = getCodexBookMeta();
    const stats = await getCodexStats();
    const books = meta.map(b => ({ ...b, entryCount: stats.byBook[b.id] ?? 0 }));
    res.json({ ok: true, books, totalEntries: stats.totalEntries });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/stats", async (_req, res) => {
  try {
    const stats = await getCodexStats();
    res.json({ ok: true, ...stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/entries", async (_req, res) => {
  try {
    const entries = await getAllCodexEntries();
    res.json({ ok: true, entries, count: entries.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/book/:bookId", async (req, res) => {
  const bookId = req.params.bookId as CodexBookId;
  if (!VALID_BOOKS.includes(bookId)) {
    return res.status(400).json({ ok: false, error: `Invalid book. Must be one of: ${VALID_BOOKS.join(", ")}` });
  }
  try {
    const entries = await getCodexBook(bookId);
    res.json({ ok: true, book: bookId, entries, count: entries.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/entry/:entryId", async (req, res) => {
  try {
    const entry = await getCodexEntry(req.params.entryId);
    if (!entry) return res.status(404).json({ ok: false, error: "Entry not found" });
    const ratifications = await getRatifications(req.params.entryId);
    res.json({ ok: true, entry, ratifications });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/entry/:entryId/ratifications", async (req, res) => {
  try {
    const ratifications = await getRatifications(req.params.entryId);
    res.json({ ok: true, ratifications, count: ratifications.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/codex/amend", async (req, res) => {
  const { book, section, title, content, provenance, tags, ratifiedBy, proofLinks, sessionId } = req.body;
  if (!book || !section || !title || !content) {
    return res.status(400).json({ ok: false, error: "book, section, title, content are required" });
  }
  if (!VALID_BOOKS.includes(book as CodexBookId)) {
    return res.status(400).json({ ok: false, error: `Invalid book. Must be one of: ${VALID_BOOKS.join(", ")}` });
  }
  try {
    const entry = await addCodexAmendment({
      book: book as CodexBookId,
      section,
      title,
      content,
      provenance: provenance ?? "council-ratified",
      tags: Array.isArray(tags) ? tags : [],
      ratifiedBy: Array.isArray(ratifiedBy) ? ratifiedBy : ["GrandCoordinatorAgent"],
      proofLinks: Array.isArray(proofLinks) ? proofLinks : [],
      sessionId,
    });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/codex/snapshot", async (_req, res) => {
  try {
    const cwd = process.cwd();
    const monorepoRoot = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;
    const snapshotDir = path.join(monorepoRoot, "_evolutions");
    const filePath = await persistCodexSnapshot(snapshotDir);
    res.json({ ok: true, snapshotPath: filePath });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/codex/ingest-doctrine", async (_req, res) => {
  try {
    const result = await ingestDoctrineDocuments();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/codex/doctrine-sources", async (_req, res) => {
  try {
    const docs = await getDoctrineDocuments();
    res.json({ ok: true, docs, count: docs.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/council/next-five", async (_req, res) => {
  try {
    const { sessionId, improvements, isNew } = await getOrCreateNextFiveSession();
    res.json({ ok: true, sessionId, improvements, isNew });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/council/next-five/convene", async (_req, res) => {
  try {
    const result = await runGrandCouncilNextFiveSession();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/council/next-five/all", async (_req, res) => {
  try {
    const improvements = await getAllImprovements();
    res.json({ ok: true, improvements, count: improvements.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/council/next-five/:rank/status", async (req, res) => {
  const rank = Number(req.params.rank);
  const { status, afterMetrics } = req.body;
  const valid = ["proposed", "ratified", "implemented", "verified"];
  if (!valid.includes(status)) {
    return res.status(400).json({ ok: false, error: `status must be one of: ${valid.join(", ")}` });
  }
  try {
    await updateImprovementStatus(rank, status, afterMetrics);
    res.json({ ok: true, rank, status });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
