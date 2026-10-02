import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { computeSacredGeometry, computeNumerology, computeSacredAlignment, getSacredGeometrySummary } from "../lib/sovereign-sacred-geometry";

const router: IRouter = Router();

router.get("/sacred-geometry", (_req, res) => {
  try {
    const data = computeSacredGeometry();
    return res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to compute sacred geometry");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/sacred-geometry/alignment", (_req, res) => {
  try {
    const alignment = computeSacredAlignment();
    return res.json(alignment);
  } catch (err) {
    logger.error({ err }, "Failed to compute sacred alignment");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/sacred-geometry/numerology/:input", (req, res) => {
  try {
    const input = req.params.input;
    const result = computeNumerology(input);
    return res.json({ input, ...result });
  } catch (err) {
    logger.error({ err }, "Failed to compute numerology");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/sacred-geometry/summary", (_req, res) => {
  try {
    const summary = getSacredGeometrySummary();
    return res.json({ summary });
  } catch (err) {
    logger.error({ err }, "Failed to compute sacred geometry summary");
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
