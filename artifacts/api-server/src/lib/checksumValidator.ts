import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { logger } from "./logger";

export interface ChecksumEntry {
  path: string;
  expectedHash: string;
  algorithm: "sha256" | "sha512";
}

export interface ChecksumResult {
  path: string;
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  error?: string;
}

const CRITICAL_FILES: ChecksumEntry[] = (
  process.env.INTEGRITY_CRITICAL_FILES
    ? JSON.parse(process.env.INTEGRITY_CRITICAL_FILES)
    : []
) as ChecksumEntry[];

async function computeHash(
  filePath: string,
  algorithm: "sha256" | "sha512"
): Promise<string> {
  const content = await readFile(filePath);
  return createHash(algorithm).update(content).digest("hex");
}

export async function validateFile(entry: ChecksumEntry): Promise<ChecksumResult> {
  try {
    const actualHash = await computeHash(entry.path, entry.algorithm);
    const valid = actualHash === entry.expectedHash;
    if (!valid) {
      logger.warn(
        { path: entry.path, expected: entry.expectedHash, actual: actualHash },
        "File integrity check FAILED"
      );
    }
    return { path: entry.path, valid, expectedHash: entry.expectedHash, actualHash };
  } catch (err) {
    const message = (err as Error).message;
    logger.error({ path: entry.path, err }, "File integrity check error");
    return {
      path: entry.path,
      valid: false,
      expectedHash: entry.expectedHash,
      actualHash: "",
      error: message,
    };
  }
}

export async function validateCriticalFiles(): Promise<ChecksumResult[]> {
  if (CRITICAL_FILES.length === 0) {
    return [];
  }
  return Promise.all(CRITICAL_FILES.map(validateFile));
}

export async function computeAndRegisterHash(
  filePath: string,
  algorithm: "sha256" | "sha512" = "sha256"
): Promise<string> {
  const hash = await computeHash(filePath, algorithm);
  logger.info({ filePath, hash, algorithm }, "Computed file hash");
  return hash;
}
