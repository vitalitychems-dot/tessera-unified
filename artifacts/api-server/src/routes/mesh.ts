import { Router, type IRouter, type Request, type Response } from "express";
import { getMeshStats, getGroupSessions, getGroupSharedState } from "../lib/session-mesh";
import { validateMeshToken } from "../lib/mesh-auth";

const router: IRouter = Router();

function requireMeshAuth(req: Request, res: Response, next: () => void): void {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required" });
    return;
  }
  next();
}

router.get("/mesh/stats", requireMeshAuth, (_req, res) => {
  try {
    const stats = getMeshStats();
    return res.json({ ok: true, ...stats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/mesh/sessions/:keyHash", requireMeshAuth, (req, res) => {
  try {
    const rawToken = req.headers["x-admin-token"];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const callerKeyHash = validateMeshToken(token);
    if (!callerKeyHash) {
      return res.status(401).json({ ok: false, error: "Valid sovereign key required" });
    }
    const keyHash = String(req.params.keyHash);
    if (keyHash !== callerKeyHash) {
      return res.status(403).json({ ok: false, error: "Forbidden: keyHash does not match your sovereign key" });
    }
    const sessions = getGroupSessions(keyHash);
    const sharedState = getGroupSharedState(keyHash);
    return res.json({ ok: true, sessions, sharedState, count: sessions.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
