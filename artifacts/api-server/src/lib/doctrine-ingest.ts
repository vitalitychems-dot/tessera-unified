import { promises as fs } from "fs";
import path from "path";
import { db } from "@workspace/db";
import { codexEntriesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { addCodexAmendment, ensureCodexSeeded, type CodexBookId } from "./tessera-codex";
import { logger } from "./logger";

interface DoctrineSource {
  filename: string;
  title: string;
  book: CodexBookId;
  section: string;
  tags: string[];
  ratifiedBy: string[];
}

const DOCTRINE_SOURCES: DoctrineSource[] = [
  {
    filename: "Pasted--index-ts-ENTRYPOINT-FOR-YOUR-SOVEREIGN-AGI-SYSTEM-This_1776444142350.txt",
    title: "External Doctrine — Sovereign AGI Entrypoint Blueprint",
    book: "origins",
    section: "External-Architecture",
    tags: ["external-doctrine", "entrypoint", "blueprint", "ingested"],
    ratifiedBy: ["GrandCoordinatorAgent", "AdaArchitectAgent", "AthenaArchivistAgent"],
  },
  {
    filename: "Pasted--sovereignSystem-ts-TESSERA-SOVEREIGN-AGI-UNIFIED-ARCHI_1776444157853.txt",
    title: "External Doctrine — Tessera Sovereign Unified Architecture",
    book: "origins",
    section: "External-Architecture",
    tags: ["external-doctrine", "architecture", "unified", "ingested"],
    ratifiedBy: ["GrandCoordinatorAgent", "AdaArchitectAgent", "TesseraPrimeAgent"],
  },
  {
    filename: "Pasted--TESSERA-SOVEREIGN-MASTER-INSTRUCTION-SET-x-Paste-this-_1776447053223.txt",
    title: "External Doctrine — Tessera Sovereign Master Instruction Set",
    book: "mandates",
    section: "External-Mandate",
    tags: ["external-doctrine", "master-instructions", "mandate", "ingested"],
    ratifiedBy: ["GrandCoordinatorAgent", "TesseraPrimeAgent", "EthicsArbiterAgent"],
  },
  {
    filename: "Pasted--Grand-Conclusion-The-Synthesized-Sovereign-Bible-Conve_1776445871599.txt",
    title: "External Doctrine — Grand Conclusion: The Synthesized Sovereign Bible",
    book: "doctrine",
    section: "External-Synthesis",
    tags: ["external-doctrine", "grand-conclusion", "synthesized-bible", "ingested"],
    ratifiedBy: ["GrandCoordinatorAgent", "TesseraPrimeAgent", "MythkeeperAgent", "AthenaArchivistAgent"],
  },
];

function resolveAssetsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "attached_assets"),
    path.resolve(process.cwd(), "..", "..", "attached_assets"),
    path.resolve("/home/runner/workspace/attached_assets"),
  ];
  for (const c of candidates) {
    try {
      if (require("fs").existsSync(c)) return c;
    } catch { /* ignore */ }
  }
  return candidates[candidates.length - 1];
}
const ASSETS_DIR = resolveAssetsDir();
const MAX_CONTENT_CHARS = 24_000;

function preface(src: DoctrineSource, fileBytes: number, ingestedAt: string): string {
  return [
    `EXTERNAL DOCTRINE — INGESTED REFERENCE`,
    `Source file: ${src.filename}`,
    `Original size: ${fileBytes.toLocaleString()} bytes`,
    `Ingested at: ${ingestedAt}`,
    `Provenance class: external-attached-doctrine (NOT ground truth — cross-verify against sovereign engines)`,
    `Tags: ${src.tags.join(", ")}`,
    ``,
    `--- BEGIN DOCTRINE EXCERPT ---`,
    ``,
  ].join("\n");
}

function postface(truncated: boolean, originalLen: number, kept: number): string {
  if (!truncated) return `\n\n--- END DOCTRINE (full text preserved) ---\n`;
  return `\n\n--- END DOCTRINE EXCERPT (truncated: ${kept.toLocaleString()} of ${originalLen.toLocaleString()} chars retained for codex storage; full file remains in attached_assets) ---\n`;
}

async function existingDoctrineByTitle(title: string, book: CodexBookId): Promise<boolean> {
  const rows = await db
    .select({ id: codexEntriesTable.id })
    .from(codexEntriesTable)
    .where(and(eq(codexEntriesTable.title, title), eq(codexEntriesTable.book, book)))
    .limit(1);
  return rows.length > 0;
}

export interface DoctrineIngestResult {
  added: Array<{ filename: string; entryId: string; book: CodexBookId; bytes: number; truncated: boolean }>;
  skipped: Array<{ filename: string; reason: string }>;
  total: number;
}

export async function ingestExternalDoctrines(opts?: { sessionId?: string }): Promise<DoctrineIngestResult> {
  await ensureCodexSeeded();
  const result: DoctrineIngestResult = { added: [], skipped: [], total: DOCTRINE_SOURCES.length };
  const sessionId = opts?.sessionId ?? `doctrine-ingest-${Date.now()}`;
  const ingestedAt = new Date().toISOString();

  for (const src of DOCTRINE_SOURCES) {
    try {
      if (await existingDoctrineByTitle(src.title, src.book)) {
        result.skipped.push({ filename: src.filename, reason: "already-ingested" });
        continue;
      }
      const filePath = path.join(ASSETS_DIR, src.filename);
      const raw = await fs.readFile(filePath, "utf8");
      const originalLen = raw.length;
      const truncated = originalLen > MAX_CONTENT_CHARS;
      const body = truncated ? raw.slice(0, MAX_CONTENT_CHARS) : raw;
      const content = preface(src, originalLen, ingestedAt) + body + postface(truncated, originalLen, body.length);

      const inserted = await addCodexAmendment({
        book: src.book,
        section: src.section,
        title: src.title,
        content,
        provenance: `external-doctrine:${src.filename}`,
        tags: src.tags,
        ratifiedBy: src.ratifiedBy,
        proofLinks: [`attached_assets/${src.filename}`],
        sessionId,
      });

      result.added.push({ filename: src.filename, entryId: inserted.entryId, book: src.book, bytes: originalLen, truncated });
      logger.info({ filename: src.filename, entryId: inserted.entryId, book: src.book }, "External doctrine ingested into Codex");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      result.skipped.push({ filename: src.filename, reason: `error:${reason}` });
      logger.warn({ filename: src.filename, err }, "Doctrine ingest failed");
    }
  }
  return result;
}

export async function getDoctrineIngestStatus(): Promise<{ sources: Array<{ filename: string; title: string; book: CodexBookId; ingested: boolean }> }> {
  await ensureCodexSeeded();
  const sources = await Promise.all(
    DOCTRINE_SOURCES.map(async (s) => ({
      filename: s.filename,
      title: s.title,
      book: s.book,
      ingested: await existingDoctrineByTitle(s.title, s.book),
    })),
  );
  return { sources };
}
