import { Router } from "express";
import {
  synthesizeBuiltInventions,
  getLastSynthesis,
  getSynthesisHistory,
  getTunableSnapshot,
} from "../lib/invention-synthesis.js";
import { getTunableHistory } from "../lib/system-tunables.js";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { inventionsTable } from "@workspace/db/schema";
import { buildInvention3DBlocks } from "../lib/invention-3d.js";

const router = Router();

async function attachSynthesisDiagrams() {
  try {
    const all = await db.select().from(inventionsTable);
    const built = all.filter((i) => i.status === "built" || i.status === "tested");
    return built.slice(0, 12).map((inv) => {
      const diagram3dBlocks = buildInvention3DBlocks({
        title: inv.title,
        category: inv.category,
        description: inv.description,
        materials: (inv.materials as string[] | null) || [],
        steps: ((inv as { steps?: string[] | null }).steps as string[] | null) || [],
        scienceBehind: (inv as { scienceBehind?: string | null }).scienceBehind ?? null,
      }, { max: 4 });
      return {
        inventionId: inv.inventionId,
        title: inv.title,
        diagram3d: diagram3dBlocks[0],
        diagram3dBlocks,
      };
    });
  } catch {
    return [];
  }
}

router.post("/inventions/synthesize", async (req, res) => {
  try {
    const applyChanges = req.body?.applyChanges !== false;
    const result = await synthesizeBuiltInventions({ applyChanges });
    const diagrams = await attachSynthesisDiagrams();
    res.json({ ok: true, result, diagrams });
  } catch (err) {
    logger.error({ err }, "Synthesis endpoint failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/inventions/synthesis/latest", (_req, res) => {
  const last = getLastSynthesis();
  res.json({ ok: true, result: last });
});

router.get("/inventions/synthesis/history", (req, res) => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || "10", 10));
  res.json({ ok: true, history: getSynthesisHistory(limit) });
});

router.get("/system/tunables", (_req, res) => {
  res.json({ ok: true, tunables: getTunableSnapshot() });
});

router.get("/system/tunables/:key/history", (req, res) => {
  try {
    res.json({ ok: true, history: getTunableHistory(req.params.key) });
  } catch (err) {
    res.status(404).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
