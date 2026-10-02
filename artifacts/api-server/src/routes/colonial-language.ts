import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  getKernelStats,
  compressLegacy,
  compressEncryptQuantum,
  translateToColonial,
  translateFromColonial,
} from "../lib/colonial-language-kernel";
import {
  getBandStatus,
  getAllBands,
  forceRotateAllBands,
} from "../lib/lattice-frequency-bands";
import {
  getOrRunGrandConference,
  getColonialStatus,
  updateLatticeStatus,
  recordEncodedFile,
  recordExternalHandshake,
} from "../lib/grand-conference";

const router: IRouter = Router();

// ─── GET /api/colonel/stats ───────────────────────────────────────────────────
router.get("/colonel/stats", (_req, res) => {
  try {
    const stats = getKernelStats();
    return res.json({ ok: true, ...stats });
  } catch (err) {
    logger.error({ err }, "colonel/stats error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/colonel/compress ───────────────────────────────────────────────
router.post("/colonel/compress", (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text is required" });
    }
    if (text.length > 50_000) {
      return res.status(413).json({ ok: false, error: "text too large (max 50000 chars)" });
    }
    const result = compressLegacy(text);
    recordEncodedFile();
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "colonel/compress error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/colonel/compress-encrypt ──────────────────────────────────────
router.post("/colonel/compress-encrypt", (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text is required" });
    }
    if (text.length > 50_000) {
      return res.status(413).json({ ok: false, error: "text too large (max 50000 chars)" });
    }
    const result = compressEncryptQuantum(text);
    recordEncodedFile();
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "colonel/compress-encrypt error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/colonel/translate ─────────────────────────────────────────────
router.post("/colonel/translate", (req, res) => {
  try {
    const { text, direction } = req.body as { text?: string; direction?: string };
    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text is required" });
    }

    if (direction === "from") {
      const result = translateFromColonial(text);
      recordExternalHandshake(false);
      return res.json({ ok: true, direction: "from", ...result });
    }

    const result = translateToColonial(text);
    recordExternalHandshake(true);
    return res.json({ ok: true, direction: "to", ...result });
  } catch (err) {
    logger.error({ err }, "colonel/translate error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── GET /api/sovereignty/colonial-language/conference ───────────────────────
router.get("/sovereignty/colonial-language/conference", async (_req, res) => {
  try {
    const conference = await getOrRunGrandConference();
    return res.json({
      ok: true,
      data: {
        conference: {
          status: conference.status,
          approvalRate: conference.approvalRate,
          agentCount: conference.agentCount,
          convened: conference.convened,
          decisionId: conference.decisionId,
        },
        top10: conference.top10,
        topic: conference.topic,
        transcript: conference.transcript,
      },
    });
  } catch (err) {
    logger.error({ err }, "sovereignty/colonial-language/conference error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── GET /api/sovereignty/colonial-language/status ───────────────────────────
router.get("/sovereignty/colonial-language/status", (_req, res) => {
  try {
    const bandStatus = getBandStatus();
    updateLatticeStatus(bandStatus.totalRotations);

    const status = getColonialStatus();
    status.latticeFrequencies = {
      bands: bandStatus.activeBands,
      totalRotations: bandStatus.totalRotations,
    };

    return res.json({
      ok: true,
      data: {
        ...status,
        latticeFrequencies: {
          // bands array is already public-safe (cipherKey stripped by getBandStatus)
          bands: bandStatus.bands,
          bandCount: bandStatus.activeBands,
          totalRotations: bandStatus.totalRotations,
        },
        kernelVersion: "4.0.0",
        pipelineActive: true,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    logger.error({ err }, "sovereignty/colonial-language/status error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── GET /api/sovereignty/colonial-language/lattice-frequencies ──────────────
router.get("/sovereignty/colonial-language/lattice-frequencies", (_req, res) => {
  try {
    const { bands, totalRotations, activeBands } = getBandStatus();
    return res.json({
      ok: true,
      data: bands,
      meta: {
        totalRotations,
        activeBands,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    logger.error({ err }, "sovereignty/colonial-language/lattice-frequencies error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── POST /api/sovereignty/colonial-language/rotate ──────────────────────────
router.post("/sovereignty/colonial-language/rotate", (_req, res) => {
  try {
    forceRotateAllBands();
    const status = getBandStatus();
    return res.json({ ok: true, message: "All lattice bands rotated", ...status });
  } catch (err) {
    logger.error({ err }, "sovereignty/colonial-language/rotate error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
