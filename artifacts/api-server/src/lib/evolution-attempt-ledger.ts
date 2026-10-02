import { mkdirSync, appendFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { logger } from "./logger";

function getLedgerDir(): string {
  return process.env["EVO_LEDGER_DIR"] ?? join(process.cwd(), "_evolutions");
}
function getLedgerPath(): string {
  return join(getLedgerDir(), "attempt-ledger.jsonl");
}

export type AttemptEvent =
  | "PROPOSED"
  | "SANDBOXED_PASS"
  | "SANDBOXED_FAIL"
  | "APPLIED"
  | "REVERTED";

export interface AttemptEntry {
  id: string;
  proposalId: string;
  event: AttemptEvent;
  targetModule: string;
  reason?: string;
  verifyOutput?: string;
  verifyExitCode?: number;
  durationMs?: number;
  timestamp: number;
  /** Whether the JSONL append succeeded. False → memory-only (durability gap). */
  persisted?: boolean;
}

const memoryLedger: AttemptEntry[] = [];
const MAX_MEMORY = 500;

function ensureDir(): void {
  const dir = getLedgerDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

let loaded = false;
function loadFromDisk(): void {
  if (loaded) return;
  loaded = true;
  try {
    const path = getLedgerPath();
    if (!existsSync(path)) return;
    const lines = readFileSync(path, "utf8").split("\n").filter(l => l.trim().length > 0);
    const recent = lines.slice(-MAX_MEMORY);
    for (const line of recent) {
      try {
        const parsed = JSON.parse(line) as AttemptEntry;
        if (parsed && typeof parsed === "object" && parsed.event) memoryLedger.push(parsed);
      } catch { /* skip malformed line */ }
    }
  } catch (err) {
    logger.warn({ err }, "AttemptLedger: failed to load existing ledger");
  }
}

export function recordAttempt(
  entry: Omit<AttemptEntry, "id" | "timestamp"> & { timestamp?: number },
): AttemptEntry {
  loadFromDisk();
  ensureDir();
  const full: AttemptEntry = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp ?? Date.now(),
    proposalId: entry.proposalId,
    event: entry.event,
    targetModule: entry.targetModule,
    reason: entry.reason,
    verifyOutput: entry.verifyOutput,
    verifyExitCode: entry.verifyExitCode,
    durationMs: entry.durationMs,
  };
  try {
    appendFileSync(getLedgerPath(), JSON.stringify(full) + "\n", "utf8");
    full.persisted = true;
  } catch (err) {
    full.persisted = false;
    logger.warn({ err, proposalId: full.proposalId }, "AttemptLedger: append failed (memory-only)");
  }
  memoryLedger.push(full);
  if (memoryLedger.length > MAX_MEMORY) memoryLedger.splice(0, memoryLedger.length - MAX_MEMORY);
  return full;
}

export function getRecentAttempts(limit = 50): AttemptEntry[] {
  loadFromDisk();
  const n = Math.max(1, Math.min(limit, MAX_MEMORY));
  return memoryLedger.slice(-n).reverse();
}

export function getAttemptsByProposal(proposalId: string): AttemptEntry[] {
  loadFromDisk();
  return memoryLedger.filter(e => e.proposalId === proposalId);
}

export function _clearLedgerForTests(): void {
  memoryLedger.length = 0;
  loaded = false;
  try {
    const p = getLedgerPath();
    if (existsSync(p)) unlinkSync(p);
  } catch { /* ignore */ }
}
