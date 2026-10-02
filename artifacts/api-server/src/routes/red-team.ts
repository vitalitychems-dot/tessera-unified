import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { runRedTeamSweep, getRedTeamFindings, getRedTeamStats } from "../lib/red-team-agent";
import { getSandboxPolicyStats } from "../lib/external-sandbox-policy";
import { validateMeshToken } from "../lib/mesh-auth";

const router: IRouter = Router();

const sweepRateLimit = { last: 0, windowMs: 30_000 };
function requireSovereignAuth(req: Request, res: Response, next: NextFunction): void {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required — manual sweeps are privileged" });
    return;
  }
  const now = Date.now();
  if (now - sweepRateLimit.last < sweepRateLimit.windowMs) {
    res.status(429).json({ ok: false, error: "Red-team sweep rate-limited; autonomous sweeps run on 10-minute cycle." });
    return;
  }
  sweepRateLimit.last = now;
  next();
}

router.get("/red-team/findings", (req, res) => {
  const limit = req.query.limit ? Math.max(1, Math.min(200, Number(req.query.limit))) : 50;
  res.json({ ok: true, findings: getRedTeamFindings(limit), stats: getRedTeamStats() });
});

router.get("/red-team/stats", (_req, res) => {
  res.json({ ok: true, ...getRedTeamStats(), sandbox: getSandboxPolicyStats() });
});

router.post("/red-team/sweep", requireSovereignAuth, async (_req, res) => {
  const findings = await runRedTeamSweep();
  res.json({ ok: true, findings, stats: getRedTeamStats() });
});

export default router;
