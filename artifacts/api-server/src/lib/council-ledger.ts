// ─────────────────────────────────────────────────────────────────────────────
// Council Ledger — Heavy Council INTEG-1 (84.7%) and INTEG-2 (67.3%).
//
// An append-only JSONL ledger of every ratified (or rejected) proposal so
// votes survive a restart. Bounded by line count with a single rotation
// (.1 backup). Pure node:fs, no external service. Safe to read because it
// contains no credential material — only proposal text and ballot summaries.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";

const LEDGER_DIR = path.resolve(process.cwd(), "data");
const LEDGER_PATH = path.join(LEDGER_DIR, "council-ledger.jsonl");
const LEDGER_BACKUP = path.join(LEDGER_DIR, "council-ledger.jsonl.1");
const MAX_LINES = 2048;

export interface LedgerEntry {
  id: string;
  title: string;
  category: string;
  status: string;
  approvalRate: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  createdAt: number;
  proposedBy: string;
}

let _writeChain: Promise<void> = Promise.resolve();

async function ensureDir(): Promise<void> {
  await fs.mkdir(LEDGER_DIR, { recursive: true });
}

async function rotateIfLarge(): Promise<void> {
  try {
    const stat = await fs.stat(LEDGER_PATH);
    if (stat.size < 1_000_000) return;
    const data = await fs.readFile(LEDGER_PATH, "utf8");
    const lines = data.split("\n").filter(Boolean);
    if (lines.length <= MAX_LINES) return;
    const keep = lines.slice(-MAX_LINES);
    await fs.writeFile(LEDGER_BACKUP, lines.slice(0, lines.length - MAX_LINES).join("\n") + "\n", "utf8");
    await fs.writeFile(LEDGER_PATH, keep.join("\n") + "\n", "utf8");
  } catch {
    // No ledger yet, nothing to rotate.
  }
}

export function appendToLedger(entry: LedgerEntry): void {
  // Serialize all writes through a chain so concurrent appends never interleave.
  _writeChain = _writeChain.then(async () => {
    try {
      await ensureDir();
      await rotateIfLarge();
      await fs.appendFile(LEDGER_PATH, JSON.stringify(entry) + "\n", "utf8");
    } catch (err) {
      process.stderr.write(`[council-ledger] WARN append failed: ${(err as Error).message}\n`);
    }
  });
}

export async function readLedger(limit = 50): Promise<LedgerEntry[]> {
  try {
    const data = await fs.readFile(LEDGER_PATH, "utf8");
    const lines = data.split("\n").filter(Boolean);
    const tail = lines.slice(-Math.max(1, Math.min(500, limit)));
    const out: LedgerEntry[] = [];
    for (const line of tail) {
      try { out.push(JSON.parse(line) as LedgerEntry); } catch { /* skip malformed */ }
    }
    return out.reverse(); // newest first
  } catch {
    return [];
  }
}
