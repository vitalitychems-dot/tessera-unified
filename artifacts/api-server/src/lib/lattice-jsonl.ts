import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const DATA_DIR = path.resolve(process.cwd(), "data");

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export async function appendJsonl<T extends object>(filename: string, row: T): Promise<void> {
  ensureDir();
  const full = path.join(DATA_DIR, filename);
  await fs.appendFile(full, JSON.stringify(row) + "\n", "utf8");
}

export async function readJsonl<T = unknown>(filename: string): Promise<T[]> {
  ensureDir();
  const full = path.join(DATA_DIR, filename);
  if (!existsSync(full)) return [];
  try {
    const txt = await fs.readFile(full, "utf8");
    const out: T[] = [];
    for (const line of txt.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try { out.push(JSON.parse(trimmed) as T); } catch { /* skip bad line */ }
    }
    return out;
  } catch (err) {
    logger.warn({ err: (err as Error).message, filename }, "lattice-jsonl read failed");
    return [];
  }
}

export async function rewriteJsonl<T extends object>(filename: string, rows: T[]): Promise<void> {
  ensureDir();
  const full = path.join(DATA_DIR, filename);
  const tmp = full + ".tmp";
  const txt = rows.map(r => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  await fs.writeFile(tmp, txt, "utf8");
  await fs.rename(tmp, full);
}
