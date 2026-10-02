import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getSystemHealthSnapshot } from "../lib/meta-introspector";

const router: IRouter = Router();

router.get("/meta/health-snapshot", async (_req, res) => {
  try {
    logger.info("MetaIntrospector API: computing health snapshot");
    const snapshot = await getSystemHealthSnapshot();
    return res.json({ ok: true, snapshot });
  } catch (err) {
    logger.error({ err }, "MetaIntrospector API: failed to compute health snapshot");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
