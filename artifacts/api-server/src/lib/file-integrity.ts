import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { integrityChecksTable } from "@workspace/db";
import { logger } from "./logger";
import { restoreMissingFile, snapshotFile } from "./auto-recovery";
import type { FileIntegrityRecord, IntegrityStatus } from "../core/types";

const CRITICAL_FILES = [
  "artifacts/api-server/src/app.ts",
  "artifacts/api-server/src/index.ts",
  "artifacts/api-server/src/routes/index.ts",
  "artifacts/api-server/src/routes/health.ts",
  "artifacts/api-server/src/lib/logger.ts",
  "artifacts/api-server/src/lib/file-integrity.ts",
  "artifacts/api-server/src/lib/anomaly-detection.ts",
  "artifacts/api-server/src/lib/auto-recovery.ts",
  "artifacts/api-server/src/core/types.ts",
  "lib/db/src/schema/system.ts",
  "artifacts/api-server/src/lib/sovereign-kernel.ts",
  "artifacts/api-server/src/lib/sovereign-file-registry.ts",
  "artifacts/api-server/src/lib/identity-reinforcement.ts",
  "artifacts/api-server/src/lib/tessera-knowledge.ts",
  "artifacts/api-server/src/lib/consciousness-engine.ts",
  "artifacts/api-server/src/lib/self-code-evolution.ts",
  "artifacts/api-server/src/lib/secureExternalWrapper.ts",
  "artifacts/api-server/src/lib/provider-registry.ts",
  "artifacts/api-server/src/lib/sovereign-memory-vault.ts",
  "artifacts/api-server/src/lib/consensus-engine.ts",
  "artifacts/api-server/src/lib/council-executor.ts",
  "artifacts/api-server/src/lib/agent-hierarchy.ts",
  "artifacts/api-server/src/lib/sovereign-sacred-geometry.ts",
  "artifacts/api-server/src/lib/sovereign-benchmarks.ts",
];

function resolveWorkspaceRoot(): string {
  if (process.env.WORKSPACE_ROOT) {
    return process.env.WORKSPACE_ROOT;
  }
  const fromCwd = path.resolve(process.cwd(), "../..");
  if (fs.existsSync(path.join(fromCwd, "package.json"))) {
    return fromCwd;
  }
  return fromCwd;
}

export const WORKSPACE_ROOT = resolveWorkspaceRoot();

export interface IntegrityReport {
  totalFiles: number;
  checkedFiles: number;
  passedFiles: number;
  failedFiles: number;
  missingFiles: number;
  records: FileIntegrityRecord[];
  lastCheck: Date;
}

function checksumFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

function resolveFilePath(relPath: string): string {
  return path.resolve(WORKSPACE_ROOT, relPath);
}

async function getLastChecksum(filePath: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(integrityChecksTable)
      .orderBy(integrityChecksTable.checkedAt);
    const match = rows.filter(r => r.filePath === filePath).pop();
    return match?.checksum ?? null;
  } catch {
    return null;
  }
}

function takeBaselineSnapshots(): void {
  let snapshotCount = 0;
  for (const relPath of CRITICAL_FILES) {
    const absPath = resolveFilePath(relPath);
    if (fs.existsSync(absPath)) {
      const ok = snapshotFile(relPath, absPath);
      if (ok) snapshotCount++;
    }
  }
  logger.info({ snapshotCount, total: CRITICAL_FILES.length }, "Baseline snapshots taken for file recovery");
}

export async function runIntegrityCheck(): Promise<IntegrityReport> {
  const records: FileIntegrityRecord[] = [];
  let passed = 0;
  let failed = 0;
  let missing = 0;

  for (const relPath of CRITICAL_FILES) {
    const absPath = resolveFilePath(relPath);
    const exists = fs.existsSync(absPath);

    if (!exists) {
      logger.warn({ relPath }, "Critical file missing — attempting auto-restore from snapshot");
      const restored = await restoreMissingFile(relPath, WORKSPACE_ROOT);

      if (restored && fs.existsSync(absPath)) {
        const checksum = checksumFile(absPath);
        const record: FileIntegrityRecord = {
          filePath: relPath,
          checksum: checksum ?? "",
          status: "clean",
          lastChecked: new Date(),
        };
        records.push(record);
        passed++;

        try {
          await db.insert(integrityChecksTable).values({
            filePath: relPath,
            checksum: checksum ?? "",
            status: "clean",
          });
        } catch (err) {
          logger.warn({ err, relPath }, "Failed to store restored file integrity record");
        }
      } else {
        missing++;
        const record: FileIntegrityRecord = {
          filePath: relPath,
          checksum: "",
          status: "missing",
          lastChecked: new Date(),
        };
        records.push(record);

        try {
          await db.insert(integrityChecksTable).values({
            filePath: relPath,
            checksum: "",
            status: "missing",
          });
        } catch (err) {
          logger.warn({ err, relPath }, "Failed to store missing file integrity record");
        }
      }
      continue;
    }

    const checksum = checksumFile(absPath);
    if (!checksum) {
      failed++;
      records.push({ filePath: relPath, checksum: "", status: "unverified", lastChecked: new Date() });
      continue;
    }

    const previous = await getLastChecksum(relPath);
    let status: IntegrityStatus = "clean";

    if (previous && previous !== checksum) {
      status = "tampered";
      failed++;
      logger.warn({ relPath, previous, current: checksum }, "File integrity violation detected");
    } else {
      passed++;
    }

    const record: FileIntegrityRecord = {
      filePath: relPath,
      checksum,
      status,
      lastChecked: new Date(),
      previousChecksum: previous ?? undefined,
    };
    records.push(record);

    try {
      await db.insert(integrityChecksTable).values({
        filePath: relPath,
        checksum,
        status,
        previousChecksum: previous ?? null,
      });
    } catch (err) {
      logger.warn({ err, relPath }, "Failed to store integrity record");
    }
  }

  const report: IntegrityReport = {
    totalFiles: CRITICAL_FILES.length,
    checkedFiles: CRITICAL_FILES.length - missing,
    passedFiles: passed,
    failedFiles: failed + missing,
    missingFiles: missing,
    records,
    lastCheck: new Date(),
  };

  logger.info(
    { passed, failed, missing, total: CRITICAL_FILES.length },
    "File integrity check complete"
  );

  return report;
}

let cachedReport: IntegrityReport | null = null;
let lastRunTime = 0;
const CACHE_TTL_MS = 60_000;

export async function getIntegrityReport(force = false): Promise<IntegrityReport> {
  const now = Date.now();
  if (!force && cachedReport && now - lastRunTime < CACHE_TTL_MS) {
    return cachedReport;
  }
  cachedReport = await runIntegrityCheck();
  lastRunTime = now;
  return cachedReport;
}

export async function initFileIntegrity(): Promise<void> {
  logger.info("Initializing file integrity module");
  try {
    takeBaselineSnapshots();
    await runIntegrityCheck();
    logger.info("File integrity baseline established");
  } catch (err) {
    logger.error({ err }, "File integrity initialization failed");
  }
}
