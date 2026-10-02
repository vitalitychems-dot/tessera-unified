import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  getHealingIncidents,
  getHealingStats,
  runHealingSweep,
  listStrategies,
  setAutoHealerEnabled,
} from "../lib/auto-healer";
import { validateSovereignAdminToken } from "../lib/mesh-auth";

const router: IRouter = Router();

const rateLimit = { last: 0, windowMs: 20_000 };
function requireSovereignAuth(req: Request, res: Response, next: NextFunction): void {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  if (!validateSovereignAdminToken(token)) {
    res.status(401).json({ ok: false, error: "Valid SOVEREIGN_ADMIN_TOKEN required — manual healing is privileged" });
    return;
  }
  const now = Date.now();
  if (now - rateLimit.last < rateLimit.windowMs) {
    res.status(429).json({ ok: false, error: "Healing sweep rate-limited; autonomous sweeps run every 45s." });
    return;
  }
  rateLimit.last = now;
  next();
}

router.get("/auto-healer/incidents", (req, res) => {
  const limit = req.query.limit ? Math.max(1, Math.min(300, Number(req.query.limit))) : 50;
  res.json({ ok: true, incidents: getHealingIncidents(limit), stats: getHealingStats() });
});

router.get("/auto-healer/stats", (_req, res) => {
  res.json({ ok: true, ...getHealingStats(), strategies: listStrategies() });
});

router.get("/auto-healer/strategies", (_req, res) => {
  res.json({ ok: true, strategies: listStrategies() });
});

router.post("/auto-healer/sweep", requireSovereignAuth, async (_req, res) => {
  const incidents = await runHealingSweep({ manual: true });
  res.json({ ok: true, incidents, stats: getHealingStats() });
});

router.post("/auto-healer/enabled", requireSovereignAuth, (req, res) => {
  const on = Boolean(req.body?.enabled);
  setAutoHealerEnabled(on);
  res.json({ ok: true, enabled: on });
});

export default router;
