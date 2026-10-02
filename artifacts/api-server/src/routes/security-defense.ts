import { Router } from "express";
import { db } from "@workspace/db";
import { securityAuditLog } from "@workspace/db";
import { desc, eq, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function classifyThreat(row: {
  targetUrl: string | null;
  method: string | null;
  flagReason: string | null;
  status: number | null;
}): { severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; attackType: string } {
  const url = (row.targetUrl ?? "").toLowerCase();
  const reason = (row.flagReason ?? "").toLowerCase();

  if (url.includes("../") || url.includes("..%2f") || reason.includes("traversal")) {
    return { severity: "CRITICAL", attackType: "DIR_TRAVERSAL" };
  }
  if (url.includes("select ") || url.includes("union ") || url.includes("drop ") || reason.includes("sql")) {
    return { severity: "CRITICAL", attackType: "SQL_INJECTION" };
  }
  if (url.includes("<script") || url.includes("javascript:") || reason.includes("xss")) {
    return { severity: "HIGH", attackType: "XSS" };
  }
  if (reason.includes("burst") || reason.includes("rate")) {
    return { severity: "HIGH", attackType: "RATE_ABUSE" };
  }
  if (url.includes("admin") || url.includes("shell") || url.includes("exec") || url.includes(".env")) {
    return { severity: "HIGH", attackType: "PROBE" };
  }
  if (reason.includes("domain not in allowlist") || reason.includes("allowlist")) {
    return { severity: "MEDIUM", attackType: "UNAUTHORIZED_DOMAIN" };
  }
  if (row.status !== null && row.status >= 400) {
    return { severity: "LOW", attackType: "CLIENT_ERROR" };
  }
  return { severity: "LOW", attackType: "FLAGGED_REQUEST" };
}

router.get("/security/real-threats", async (req, res) => {
  try {
    const sinceHours = parseInt(String(req.query.hours ?? "24"), 10);
    const since = new Date(Date.now() - sinceHours * 3600 * 1000);

    const rows = await db
      .select()
      .from(securityAuditLog)
      .where(gte(securityAuditLog.timestamp, since))
      .orderBy(desc(securityAuditLog.timestamp))
      .limit(200);

    const flaggedRows = rows.filter(r => r.flagged);

    const events = flaggedRows.map(r => {
      const { severity, attackType } = classifyThreat({
        targetUrl: r.targetUrl,
        method: r.method,
        flagReason: r.flagReason,
        status: r.status,
      });

      return {
        id: r.id,
        targetUrl: r.targetUrl,
        method: r.method,
        status: r.status,
        durationMs: r.durationMs,
        flagReason: r.flagReason,
        requestedBy: r.requestedBy,
        timestamp: r.timestamp?.toISOString() ?? new Date().toISOString(),
        severity,
        attackType,
      };
    });

    const stats = {
      totalInterceptions: flaggedRows.length,
      unauthorizedDomainAttempts: events.filter(e => e.attackType === "UNAUTHORIZED_DOMAIN").length,
      sqlInjectionAttempts: events.filter(e => e.attackType === "SQL_INJECTION").length,
      xssAttempts: events.filter(e => e.attackType === "XSS").length,
      dirTraversalAttempts: events.filter(e => e.attackType === "DIR_TRAVERSAL").length,
      scannerBots: events.filter(e => e.attackType === "PROBE").length,
      rateAbuseEvents: events.filter(e => e.attackType === "RATE_ABUSE").length,
      requestsMonitored: rows.length,
      sinceHours,
      criticalCount: events.filter(e => e.severity === "CRITICAL").length,
      highCount: events.filter(e => e.severity === "HIGH").length,
    };

    return res.json({ ok: true, stats, events });
  } catch (err) {
    logger.error({ err }, "GET /security/real-threats failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/security/defense-state", async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const rows = await db
      .select()
      .from(securityAuditLog)
      .where(gte(securityAuditLog.timestamp, since24h))
      .orderBy(desc(securityAuditLog.timestamp))
      .limit(500);

    const flaggedRows = rows.filter(r => r.flagged);

    const interceptions = flaggedRows.slice(0, 50).map(r => {
      const { severity, attackType } = classifyThreat({
        targetUrl: r.targetUrl,
        method: r.method,
        flagReason: r.flagReason,
        status: r.status,
      });

      const isCriticalOrHigh = severity === "CRITICAL" || severity === "HIGH";

      return {
        id: `intercept-${r.id}`,
        auditLogId: r.id,
        requestedBy: r.requestedBy ?? "unknown",
        method: r.method ?? "unknown",
        targetUrl: r.targetUrl ?? "unknown",
        status: r.status,
        durationMs: r.durationMs,
        flagReason: r.flagReason,
        timestamp: r.timestamp?.getTime() ?? Date.now(),
        severity: severity.toLowerCase() as "critical" | "high" | "medium" | "low",
        attackType,
        realDataProtected: true,
        satkoteDeployed: isCriticalOrHigh,
        satkoteId: isCriticalOrHigh ? `satkote-${r.id}` : null,
      };
    });

    const satkoteNodes = interceptions
      .filter(i => i.satkoteDeployed && i.satkoteId)
      .map(i => ({
        id: i.satkoteId!,
        auditLogId: i.auditLogId,
        targetEndpoint: i.targetUrl,
        status: "monitoring",
        severity: i.severity,
        attackType: i.attackType,
        requestedBy: i.requestedBy,
        flagReason: i.flagReason,
        detectedAt: i.timestamp,
        scrapedIntel: [
          `Endpoint: ${i.targetUrl.slice(0, 80)}`,
          `Method: ${i.method}`,
          `Status: ${i.status ?? "blocked"}`,
          `Duration: ${i.durationMs ?? 0}ms`,
          `Flag reason: ${i.flagReason?.slice(0, 80) ?? "n/a"}`,
        ],
      }));

    return res.json({
      ok: true,
      satkoteNodes,
      interceptions,
      totalInterceptionsBlocked: flaggedRows.length,
      totalRequestsMonitored: rows.length,
      lastScan: Date.now(),
      windowHours: 24,
    });
  } catch (err) {
    logger.error({ err }, "GET /security/defense-state failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/security/attacker/:interceptionId", async (req, res) => {
  try {
    const { interceptionId } = req.params;
    const idNum = parseInt(interceptionId.replace("intercept-", ""), 10);

    if (isNaN(idNum)) {
      return res.status(404).json({ ok: false, error: "Interception not found" });
    }

    const rows = await db
      .select()
      .from(securityAuditLog)
      .where(eq(securityAuditLog.id, idNum))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Interception not found in audit log" });
    }

    const r = rows[0];
    const { severity, attackType } = classifyThreat({
      targetUrl: r.targetUrl,
      method: r.method,
      flagReason: r.flagReason,
      status: r.status,
    });

    const isCriticalOrHigh = severity === "CRITICAL" || severity === "HIGH";

    const interception = {
      id: interceptionId,
      auditLogId: r.id,
      requestedBy: r.requestedBy ?? "unknown",
      method: r.method ?? "unknown",
      targetUrl: r.targetUrl ?? "unknown",
      status: r.status,
      durationMs: r.durationMs,
      flagReason: r.flagReason,
      timestamp: r.timestamp?.getTime() ?? Date.now(),
      severity: severity.toLowerCase() as "critical" | "high" | "medium" | "low",
      attackType,
      realDataProtected: true,
      satkoteDeployed: isCriticalOrHigh,
      satkoteId: isCriticalOrHigh ? `satkote-${r.id}` : null,
    };

    const satkoteNode = isCriticalOrHigh ? {
      id: `satkote-${r.id}`,
      auditLogId: r.id,
      targetEndpoint: r.targetUrl,
      status: "monitoring",
      severity: severity.toLowerCase(),
      attackType,
      requestedBy: r.requestedBy,
      flagReason: r.flagReason,
      detectedAt: r.timestamp?.getTime() ?? Date.now(),
      scrapedIntel: [
        `Endpoint: ${(r.targetUrl ?? "").slice(0, 80)}`,
        `Method: ${r.method ?? "unknown"}`,
        `HTTP Status: ${r.status ?? "blocked"}`,
        `Duration: ${r.durationMs ?? 0}ms`,
        `Flag: ${(r.flagReason ?? "").slice(0, 80)}`,
        `Requester: ${r.requestedBy ?? "unknown"}`,
      ],
    } : null;

    return res.json({ ok: true, interception, satkoteNode });
  } catch (err) {
    logger.error({ err }, "GET /security/attacker/:id failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
