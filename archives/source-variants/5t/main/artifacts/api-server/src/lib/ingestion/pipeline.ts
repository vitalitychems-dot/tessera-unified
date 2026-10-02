import * as crypto from "crypto";
import { db } from "@workspace/db";
import { ingestedDataTable, ingestionJobsTable, dataSourcesTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { storeMemory } from "../vector-memory";
import { checkDuplicateBeforeIngest } from "../semantic-deduplication";
import { logger } from "../logger";

export interface NormalizedItem {
  source: string;
  sourceType: string;
  title?: string;
  content: string;
  url?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: Date;
}

const MAX_CONTENT_LENGTH = 50_000;
const MAX_TITLE_LENGTH = 500;
const MAX_TAGS = 50;
const MAX_URL_LENGTH = 2048;

const sourceRateLimits = new Map<string, { count: number; windowStart: number }>();
const MAX_ITEMS_PER_SOURCE_PER_CYCLE = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

const ingestionAuditLog: Array<{
  timestamp: number;
  source: string;
  action: "ingested" | "rejected" | "sanitized" | "rate-limited";
  reason?: string;
  contentHash?: string;
}> = [];

function addAuditEntry(source: string, action: typeof ingestionAuditLog[0]["action"], reason?: string, contentHash?: string): void {
  ingestionAuditLog.unshift({ timestamp: Date.now(), source, action, reason, contentHash });
  if (ingestionAuditLog.length > 500) ingestionAuditLog.splice(500);
}

export function getIngestionAuditLog() {
  return {
    total: ingestionAuditLog.length,
    rejected: ingestionAuditLog.filter(e => e.action === "rejected").length,
    sanitized: ingestionAuditLog.filter(e => e.action === "sanitized").length,
    rateLimited: ingestionAuditLog.filter(e => e.action === "rate-limited").length,
    ingested: ingestionAuditLog.filter(e => e.action === "ingested").length,
    recent: ingestionAuditLog.slice(0, 50),
  };
}

function stripHtmlAndScripts(text: string): { cleaned: string; wasSanitized: boolean } {
  let wasSanitized = false;
  let cleaned = text;

  if (/<script[\s>]/i.test(cleaned)) {
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    wasSanitized = true;
  }
  if (/<style[\s>]/i.test(cleaned)) {
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    wasSanitized = true;
  }
  if (/<iframe[\s>]/i.test(cleaned)) {
    cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
    wasSanitized = true;
  }
  if (/on\w+\s*=/i.test(cleaned)) {
    cleaned = cleaned.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    wasSanitized = true;
  }
  if (/javascript:/i.test(cleaned)) {
    cleaned = cleaned.replace(/javascript:[^\s"'>]*/gi, "");
    wasSanitized = true;
  }

  if (/<[^>]+>/g.test(cleaned)) {
    cleaned = cleaned
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    wasSanitized = true;
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return { cleaned, wasSanitized };
}

function validateUrl(url: string): boolean {
  if (!url || url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function checkRateLimit(source: string): boolean {
  const now = Date.now();
  const entry = sourceRateLimits.get(source);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    sourceRateLimits.set(source, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ITEMS_PER_SOURCE_PER_CYCLE) {
    return false;
  }
  entry.count++;
  return true;
}

function sanitizeItem(item: NormalizedItem): { item: NormalizedItem; sanitized: boolean; rejectionReason?: string } {
  if (!item.content || item.content.trim().length === 0) {
    return { item, sanitized: false, rejectionReason: "empty content" };
  }

  if (item.url && !validateUrl(item.url)) {
    return { item, sanitized: false, rejectionReason: `invalid URL: ${item.url?.slice(0, 100)}` };
  }

  let wasSanitized = false;

  const { cleaned: cleanedContent, wasSanitized: contentSanitized } = stripHtmlAndScripts(item.content);
  if (contentSanitized) wasSanitized = true;

  let cleanedTitle = item.title;
  if (cleanedTitle) {
    const { cleaned, wasSanitized: titleSanitized } = stripHtmlAndScripts(cleanedTitle);
    cleanedTitle = cleaned.slice(0, MAX_TITLE_LENGTH);
    if (titleSanitized) wasSanitized = true;
  }

  const truncatedContent = cleanedContent.slice(0, MAX_CONTENT_LENGTH);
  if (truncatedContent.length < cleanedContent.length) wasSanitized = true;

  const sanitizedTags = (item.tags || [])
    .filter(t => typeof t === "string" && t.length > 0 && t.length < 100)
    .map(t => t.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  return {
    item: {
      ...item,
      content: truncatedContent,
      title: cleanedTitle,
      tags: sanitizedTags,
      url: item.url && validateUrl(item.url) ? item.url : undefined,
    },
    sanitized: wasSanitized,
  };
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

export async function isDuplicate(contentHash: string): Promise<boolean> {
  const existing = await db
    .select({ id: ingestedDataTable.id })
    .from(ingestedDataTable)
    .where(eq(ingestedDataTable.contentHash, contentHash))
    .limit(1);
  return existing.length > 0;
}

export async function ingestItem(item: NormalizedItem): Promise<{ ingested: boolean; id?: number; reason?: string }> {
  if (!checkRateLimit(item.source)) {
    addAuditEntry(item.source, "rate-limited", `Rate limit exceeded for source: ${item.source}`);
    return { ingested: false, reason: "rate-limited" };
  }

  const { item: sanitizedItem, sanitized, rejectionReason } = sanitizeItem(item);
  if (rejectionReason) {
    addAuditEntry(item.source, "rejected", rejectionReason);
    return { ingested: false, reason: rejectionReason };
  }

  if (sanitized) {
    addAuditEntry(item.source, "sanitized", "Content sanitized (HTML/script stripping or truncation)");
  }

  const text = [sanitizedItem.title, sanitizedItem.content].filter(Boolean).join(" ").trim();
  if (!text) {
    addAuditEntry(item.source, "rejected", "empty content after sanitization");
    return { ingested: false, reason: "empty content" };
  }

  const preStoreHash = crypto.createHash("sha256").update(sanitizedItem.content).digest("hex");

  const expectedHash = typeof sanitizedItem.metadata?.expectedChecksum === "string"
    ? sanitizedItem.metadata.expectedChecksum
    : null;

  if (expectedHash && expectedHash !== preStoreHash) {
    addAuditEntry(sanitizedItem.source, "rejected", `Integrity mismatch: expected ${expectedHash.slice(0, 16)}… got ${preStoreHash.slice(0, 16)}…`, preStoreHash);
    return { ingested: false, reason: "integrity-mismatch" };
  }

  const semanticDup = await checkDuplicateBeforeIngest(
    text,
    "vector_embeddings",
    sanitizedItem.source,
    { url: sanitizedItem.url, tags: sanitizedItem.tags, ...(sanitizedItem.metadata || {}) },
  );
  if (semanticDup.isDuplicate) {
    addAuditEntry(
      item.source,
      "sanitized",
      `semantic duplicate ${semanticDup.action} into canonical=${semanticDup.canonicalId} (similarity=${semanticDup.similarity?.toFixed(3)})`,
    );
    return { ingested: false, reason: `semantic-duplicate-${semanticDup.action ?? "merged"}`, id: semanticDup.canonicalId };
  }

  const contentHash = hashContent(text);
  if (await isDuplicate(contentHash)) {
    return { ingested: false, reason: "duplicate" };
  }

  let embeddingId: number | undefined;
  try {
    embeddingId = await storeMemory({
      content: text.slice(0, 8000),
      source: sanitizedItem.source,
      category: sanitizedItem.sourceType,
      metadata: { url: sanitizedItem.url, tags: sanitizedItem.tags, contentIntegrity: preStoreHash, ...(sanitizedItem.metadata || {}) },
    });
  } catch (_e) {
  }

  const contentToStore = sanitizedItem.content.slice(0, 20000);

  const [row] = await db.insert(ingestedDataTable).values({
    source: sanitizedItem.source,
    sourceType: sanitizedItem.sourceType,
    title: sanitizedItem.title,
    content: contentToStore,
    url: sanitizedItem.url,
    contentHash,
    embeddingId: embeddingId ?? null,
    tags: sanitizedItem.tags ?? [],
    metadata: { ...(sanitizedItem.metadata || {}), contentIntegrity: preStoreHash, sanitized },
    publishedAt: sanitizedItem.publishedAt ?? null,
  }).returning({ id: ingestedDataTable.id, content: ingestedDataTable.content });

  const storedContentHash = crypto.createHash("sha256").update(row.content).digest("hex");
  const expectedStoredHash = crypto.createHash("sha256").update(contentToStore).digest("hex");
  if (storedContentHash !== expectedStoredHash) {
    addAuditEntry(sanitizedItem.source, "rejected", `Post-store integrity mismatch: stored content hash ${storedContentHash.slice(0, 16)}… differs from expected ${expectedStoredHash.slice(0, 16)}…`, preStoreHash);
    await db.delete(ingestedDataTable).where(eq(ingestedDataTable.id, row.id));
    return { ingested: false, reason: "integrity-verification-failed" };
  }

  addAuditEntry(sanitizedItem.source, "ingested", undefined, contentHash);
  return { ingested: true, id: row.id };
}

export async function runSourceIngestion(
  sourceName: string,
  sourceId: number | null,
  fetchFn: () => Promise<NormalizedItem[]>
): Promise<{ ingested: number; skipped: number; errors: string[]; jobId: number }> {
  const [job] = await db.insert(ingestionJobsTable).values({
    sourceId,
    sourceName,
    status: "running",
    itemsIngested: 0,
    itemsSkipped: 0,
    errors: [],
    metadata: {},
  }).returning({ id: ingestionJobsTable.id });

  let ingested = 0;
  let skipped = 0;
  const errors: string[] = [];
  const start = Date.now();

  try {
    const items = await fetchFn();

    if (items.length > MAX_ITEMS_PER_SOURCE_PER_CYCLE * 2) {
      logger.warn({ source: sourceName, itemCount: items.length }, "Ingestion: excessive items from source, truncating");
    }

    const itemsToProcess = items.slice(0, MAX_ITEMS_PER_SOURCE_PER_CYCLE * 2);

    for (const item of itemsToProcess) {
      try {
        const result = await ingestItem(item);
        if (result.ingested) ingested++;
        else skipped++;
      } catch (e) {
        errors.push(`Item error: ${(e as Error).message}`);
        skipped++;
      }
    }
  } catch (e) {
    errors.push(`Fetch error: ${(e as Error).message}`);
  }

  const durationMs = Date.now() - start;
  await db.update(ingestionJobsTable)
    .set({
      status: errors.length > 0 && ingested === 0 ? "failed" : "completed",
      itemsIngested: ingested,
      itemsSkipped: skipped,
      errors,
      completedAt: new Date(),
      durationMs,
    })
    .where(eq(ingestionJobsTable.id, job.id));

  if (sourceId) {
    await db.update(dataSourcesTable)
      .set({
        lastRunAt: new Date(),
        lastSuccessAt: ingested > 0 ? new Date() : undefined,
        lastError: errors.length > 0 ? errors[0] : null,
        totalRuns: sql`${dataSourcesTable.totalRuns} + 1`,
      })
      .where(eq(dataSourcesTable.id, sourceId));
  }

  return { ingested, skipped, errors, jobId: job.id };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
