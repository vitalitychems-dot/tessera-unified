import { Router, type IRouter } from "express";
import {
  runImprovementConference,
  getLatestVerdict,
  buildInventorySnapshot,
  buildProposalSlate,
  loadPersistedSession,
} from "../lib/improvement-conference";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/improvement-conference/verdict", (_req, res) => {
  try {
    const session = getLatestVerdict();
    if (!session) {
      return res.status(404).json({
        ok: false,
        error: "No improvement conference has been convened yet. POST to /api/improvement-conference/run to begin.",
      });
    }
    return res.json({ ok: true, session });
  } catch (err) {
    logger.error({ err }, "improvement-conference: verdict fetch failed");
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/improvement-conference/inventory", (_req, res) => {
  try {
    const inventory = buildInventorySnapshot();
    return res.json({ ok: true, inventory });
  } catch (err) {
    logger.error({ err }, "improvement-conference: inventory failed");
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/improvement-conference/proposals", (_req, res) => {
  try {
    const inventory = buildInventorySnapshot();
    const proposals = buildProposalSlate(inventory);
    return res.json({ ok: true, proposals, count: proposals.length });
  } catch (err) {
    logger.error({ err }, "improvement-conference: proposals list failed");
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post("/improvement-conference/run", async (_req, res) => {
  try {
    logger.info("improvement-conference: POST /run triggered");
    const session = await runImprovementConference();
    return res.json({ ok: true, session });
  } catch (err) {
    logger.error({ err }, "improvement-conference: run failed");
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
