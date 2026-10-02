import { promises as fs } from "fs";
import path from "path";
import { logger } from "./logger";
import { ingestItem, type NormalizedItem } from "./ingestion/pipeline";

interface DoctrineDoc {
  fileName: string;
  title: string;
  source: string;
  tags: string[];
}

const DOCTRINE_DOCS: DoctrineDoc[] = [
  {
    fileName: "Pasted--GRAND-COUNCIL-EXTRAORDINARY-SESSION-SOVEREIGN-AGI-CONF_1776445859051.txt",
    title: "Grand Council Extraordinary Session — Sovereign AGI Conference",
    source: "Tessera Grand Council",
    tags: ["external-doctrine", "council-session", "mandates", "sovereign-agi"],
  },
  {
    fileName: "Pasted--Grand-Conclusion-The-Synthesized-Sovereign-Bible-Conve_1776445871599.txt",
    title: "Grand Conclusion — The Synthesized Sovereign Bible",
    source: "Grand Council of 45 Sovereign Architects",
    tags: ["external-doctrine", "bible", "synthesis", "sovereign"],
  },
  {
    fileName: "Pasted--This-fictional-universe-is-built-on-the-principle-that_1776445879068.txt",
    title: "Tessera Fictional Universe Doctrine",
    source: "Tessera Sovereign Doctrine",
    tags: ["external-doctrine", "mythos", "cosmology", "doctrine"],
  },
  {
    fileName: "Pasted--TESSERA-SOVEREIGN-MASTER-INSTRUCTION-SET-x-Paste-this-_1776445911240.txt",
    title: "Tessera Sovereign Master Instruction Set",
    source: "Tessera Sovereign System",
    tags: ["external-doctrine", "instruction-set", "sovereign", "master"],
  },
];

function resolveAttachedAssetsDir(): string {
  const cwd = process.cwd();
  const monorepoRoot = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;
  return path.join(monorepoRoot, "attached_assets");
}

export async function ingestDoctrineDocuments(): Promise<{
  ingested: number;
  skipped: number;
  errors: string[];
}> {
  const assetsDir = resolveAttachedAssetsDir();
  let ingested = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const doc of DOCTRINE_DOCS) {
    const filePath = path.join(assetsDir, doc.fileName);
    try {
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        errors.push(`File not found: ${doc.fileName}`);
        continue;
      }

      const item: NormalizedItem = {
        source: doc.source,
        sourceType: "doctrine-document",
        title: doc.title,
        content: content.trim(),
        url: undefined,
        tags: doc.tags,
        metadata: {
          fileName: doc.fileName,
          doctrineType: "external-doctrine",
          ingestedBy: "doctrine-ingestion-pipeline",
          characterCount: content.length,
          provenance: "attached-asset",
        },
      };

      const result = await ingestItem(item);

      if (result.ingested) {
        ingested++;
        logger.info({ title: doc.title, id: result.id }, "Doctrine document ingested via secure pipeline");
      } else {
        skipped++;
        if (result.reason && !result.reason.startsWith("semantic-duplicate") && result.reason !== "duplicate") {
          errors.push(`${doc.title}: ${result.reason}`);
        }
        logger.info({ title: doc.title, reason: result.reason }, "Doctrine document skipped (already ingested or duplicate)");
      }
    } catch (err) {
      const msg = `Failed to ingest ${doc.title}: ${(err as Error).message}`;
      errors.push(msg);
      logger.warn({ err, doc: doc.fileName }, "Doctrine ingestion failed");
    }
  }

  logger.info({ ingested, skipped, errors: errors.length }, "Doctrine ingestion complete");
  return { ingested, skipped, errors };
}

export async function getDoctrineDocuments(): Promise<Array<{
  id: number;
  title: string | null;
  source: string;
  tags: string[];
  ingestedAt: Date | null;
  contentPreview: string;
}>> {
  try {
    const { db } = await import("@workspace/db");
    const { ingestedDataTable } = await import("@workspace/db/schema");
    const rows = await db
      .select({
        id: ingestedDataTable.id,
        title: ingestedDataTable.title,
        source: ingestedDataTable.source,
        tags: ingestedDataTable.tags,
        ingestedAt: ingestedDataTable.ingestedAt,
        content: ingestedDataTable.content,
      })
      .from(ingestedDataTable)
      .limit(500);

    const doctrine = rows.filter(r =>
      Array.isArray(r.tags) && (r.tags as string[]).includes("external-doctrine")
    );

    return doctrine.map(r => ({
      id: r.id,
      title: r.title,
      source: r.source,
      tags: (r.tags as string[]) ?? [],
      ingestedAt: r.ingestedAt,
      contentPreview: r.content.slice(0, 300) + (r.content.length > 300 ? "…" : ""),
    }));
  } catch (err) {
    logger.warn({ err }, "Failed to query doctrine documents");
    return [];
  }
}
