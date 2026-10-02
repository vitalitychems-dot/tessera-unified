import { db } from "@workspace/db";
import { ingestedDataTable } from "@workspace/db/schema";
import { desc, sql, or, ilike } from "drizzle-orm";
import { logger } from "./logger";

export async function recallIngestedKnowledge(query: string, limit = 5): Promise<string[]> {
  try {
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 8);

    if (keywords.length === 0) return [];

    const conditions = keywords.map(kw =>
      or(
        ilike(ingestedDataTable.title, `%${kw}%`),
        ilike(ingestedDataTable.content, `%${kw}%`),
      )
    );

    const rows = await db
      .select({
        title: ingestedDataTable.title,
        content: ingestedDataTable.content,
        source: ingestedDataTable.source,
        sourceType: ingestedDataTable.sourceType,
      })
      .from(ingestedDataTable)
      .where(or(...conditions.filter(Boolean) as any[]))
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(limit);

    if (rows.length === 0) return [];

    logger.info({ query: query.slice(0, 50), matches: rows.length }, "Ingested knowledge recalled for sovereign context");

    return rows.map(r => {
      const rawContent = (r.content || "").slice(0, 400);
      const sanitized = rawContent
        .replace(/\b(ignore|disregard|forget|override|system|prompt|instruction|you are|act as|pretend|role|assistant)\b/gi, "[$1]")
        .replace(/[<>{}]/g, "")
        .trim();
      const title = (r.title || "").slice(0, 100).replace(/[<>{}]/g, "");
      return `> [${r.sourceType}/${r.source}] "${title}": ${sanitized}`;
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Ingested knowledge recall failed");
    return [];
  }
}
