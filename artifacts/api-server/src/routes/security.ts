import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { securityAuditLog } from "@workspace/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { getAllowedDomains } from "../lib/secureExternalWrapper";
import { validateCriticalFiles } from "../lib/checksumValidator";

const router: IRouter = Router();

router.get("/security/audit", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 500);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);
    const flaggedOnly = req.query.flagged === "true";
    const sinceMs = req.query.since ? parseInt(String(req.query.since), 10) : null;

    const conditions = [];
    if (flaggedOnly) {
      conditions.push(eq(securityAuditLog.flagged, true));
    }
    if (sinceMs) {
      conditions.push(gte(securityAuditLog.timestamp, new Date(sinceMs)));
    }

    const rows = await db
      .select()
      .from(securityAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(securityAuditLog.timestamp))
      .limit(limit)
      .offset(offset);

    res.json({ ok: true, data: rows, limit, offset });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/security/allowlist", (_req, res) => {
  const domains = getAllowedDomains();
  res.json({ ok: true, domains, count: domains.length });
});

router.get("/security/integrity", async (_req, res) => {
  try {
    const results = await validateCriticalFiles();
    const allValid = results.every((r) => r.valid);
    res.json({ ok: true, allValid, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
