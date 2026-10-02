import { Router, type Request, type Response } from "express";
import { ingestExternalDoctrines, getDoctrineIngestStatus } from "../lib/doctrine-ingest";
import { logger } from "../lib/logger";

const router = Router();

router.get("/doctrine/status", async (_req: Request, res: Response) => {
  try {
    const status = await getDoctrineIngestStatus();
    const ingested = status.sources.filter(s => s.ingested).length;
    res.json({ ok: true, ingested, total: status.sources.length, sources: status.sources });
  } catch (err) {
    logger.error({ err }, "doctrine status failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/doctrine/ingest", async (req: Request, res: Response) => {
  try {
    const sessionId = (req.body && typeof req.body.sessionId === "string") ? req.body.sessionId : undefined;
    const result = await ingestExternalDoctrines({ sessionId });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "doctrine ingest failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
