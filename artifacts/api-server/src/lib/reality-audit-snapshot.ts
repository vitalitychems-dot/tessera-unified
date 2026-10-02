import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { db } from "@workspace/db";
import { realityAuditSnapshotsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { logger } from "./logger";
import { getRealityAudit, type AuditFinding } from "./reality-audit";

function resolveEvolutionsDir(): string {
  const cwd = process.cwd();
  const monorepoRoot = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;
  return path.join(monorepoRoot, "_evolutions");
}

export interface AuditSnapshot {
  snapshotId: string;
  scannedAt: string;
  totalSurfaces: number;
  realCount: number;
  partialCount: number;
  simulatedCount: number;
  convertedCount: number;
  sovereigntyPct: number;
  findings: AuditFinding[];
  routesCovered: string[];
  summary: {
    conversionRate: number;
    verifyMismatches: number;
    totalSimulationPoints: number;
    filesWithSimulations: number;
  };
}

export async function runAndPersistAuditSnapshot(): Promise<AuditSnapshot> {
  const audit = await getRealityAudit();
  const snapshotId = `audit-${Date.now()}`;

  const realCount = audit.registry.filter(f => f.status === "real").length;
  const convertedCount = audit.registry.filter(f => f.status === "converted").length;
  const simulatedCount = audit.registry.filter(f => f.status === "simulated").length;
  const totalSurfaces = audit.registry.length;
  const sovereigntyPct = Math.round(((realCount + convertedCount) / Math.max(totalSurfaces, 1)) * 100);

  const routesCovered = audit.registry
    .filter(f => f.engineLink)
    .map(f => f.engineLink!)
    .filter((v, i, a) => a.indexOf(v) === i);

  const snapshot: AuditSnapshot = {
    snapshotId,
    scannedAt: new Date(audit.scannedAt).toISOString(),
    totalSurfaces,
    realCount,
    partialCount: 0,
    simulatedCount,
    convertedCount,
    sovereigntyPct,
    findings: audit.registry,
    routesCovered,
    summary: {
      conversionRate: audit.summary.conversionRate,
      verifyMismatches: audit.summary.verifyMismatches,
      totalSimulationPoints: audit.totalSimulationPoints,
      filesWithSimulations: audit.filesWithSimulations,
    },
  };

  const evDir = resolveEvolutionsDir();
  let snapshotPath = "";
  try {
    await fs.mkdir(evDir, { recursive: true });
    const fileName = `reality-audit-${snapshotId}.json`;
    snapshotPath = path.join(evDir, fileName);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
    logger.info({ snapshotPath, totalSurfaces, sovereigntyPct }, "Reality audit snapshot persisted");
  } catch (err) {
    logger.warn({ err }, "Failed to write reality audit snapshot to _evolutions/");
  }

  try {
    const snapshotHash = createHash("sha256").update(snapshotId).digest("hex").slice(0, 32);
    await db.insert(realityAuditSnapshotsTable).values({
      snapshotHash,
      jsonPath: snapshotPath || "",
      trigger: "api-call",
      totalFindings: totalSurfaces,
      realBacked: realCount,
      converted: convertedCount,
      stillSimulated: simulatedCount,
      verifyMismatches: snapshot.summary.verifyMismatches,
      totalSimulationPoints: snapshot.summary.totalSimulationPoints,
      filesWithSimulations: snapshot.summary.filesWithSimulations,
      conversionRate: String(snapshot.summary.conversionRate),
      payload: snapshot as unknown as Record<string, unknown>,
    }).onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "Failed to persist reality audit snapshot to DB");
  }

  return snapshot;
}

export async function getLatestAuditSnapshot(): Promise<AuditSnapshot | null> {
  try {
    const rows = await db
      .select()
      .from(realityAuditSnapshotsTable)
      .orderBy(desc(realityAuditSnapshotsTable.scannedAt))
      .limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    const p = r.payload as AuditSnapshot | null;
    if (p && p.snapshotId) return p;
    return {
      snapshotId: r.snapshotHash,
      scannedAt: r.scannedAt.toISOString(),
      totalSurfaces: r.totalFindings,
      realCount: r.realBacked,
      partialCount: 0,
      simulatedCount: r.stillSimulated,
      convertedCount: r.converted,
      sovereigntyPct: Math.round(((r.realBacked + r.converted) / Math.max(r.totalFindings, 1)) * 100),
      findings: [],
      routesCovered: [],
      summary: {
        conversionRate: Number(r.conversionRate) || 0,
        verifyMismatches: r.verifyMismatches,
        totalSimulationPoints: r.totalSimulationPoints,
        filesWithSimulations: r.filesWithSimulations,
      },
    };
  } catch (err) {
    logger.warn({ err }, "Failed to load latest audit snapshot from DB");
    return null;
  }
}

export async function listAuditSnapshots(limit = 20): Promise<Array<{
  snapshotId: string;
  scannedAt: string;
  sovereigntyPct: number;
  totalSurfaces: number;
  snapshotPath: string | null;
}>> {
  try {
    const rows = await db
      .select()
      .from(realityAuditSnapshotsTable)
      .orderBy(desc(realityAuditSnapshotsTable.scannedAt))
      .limit(limit);
    return rows.map(r => {
      const p = r.payload as AuditSnapshot | null;
      return {
        snapshotId: p?.snapshotId ?? r.snapshotHash,
        scannedAt: r.scannedAt.toISOString(),
        sovereigntyPct: p?.sovereigntyPct ?? Math.round(((r.realBacked + r.converted) / Math.max(r.totalFindings, 1)) * 100),
        totalSurfaces: p?.totalSurfaces ?? r.totalFindings,
        snapshotPath: r.jsonPath || null,
      };
    });
  } catch (err) {
    logger.warn({ err }, "Failed to list audit snapshots");
    return [];
  }
}
