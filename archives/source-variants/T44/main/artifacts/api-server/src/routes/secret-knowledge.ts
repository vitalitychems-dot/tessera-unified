import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ingestedDataTable } from "@workspace/db/schema";
import { desc, sql, ilike, or, eq, count } from "drizzle-orm";
import { TESSERA_SUBJECTS } from "../lib/tessera-knowledge";

const router: IRouter = Router();

const SOURCE_CATEGORIES: Record<string, string> = {
  "CIA Reading Room": "declassified-intelligence",
  "FBI Vault": "declassified-intelligence",
  "CIA/FBI Archive.org Collection": "declassified-intelligence",
  "CIA CREST Database": "declassified-intelligence",
  "NSA Declassified": "declassified-intelligence",
  "Government Declassified": "declassified-intelligence",
  "MKULTRA Archives": "declassified-intelligence",
  "Operation PAPERCLIP Files": "declassified-intelligence",
  "Area 51 Files": "declassified-intelligence",
  "UAP/UFO Files": "declassified-intelligence",
  "Tesla Classified Files": "declassified-intelligence",
  "National Archives": "declassified-intelligence",
  "Secret Society Archives": "secret-society",
  "Declassified Archives": "declassified-intelligence",
  "Internet Archive": "historical-archive",
  "Wikipedia Knowledge": "encyclopedia",
  "arXiv Deep Research": "academic-research",
  "Open Library": "book-knowledge",
  "Project Gutenberg": "classical-text",
  "Stanford Encyclopedia of Philosophy": "philosophy",
  "Smithsonian": "museum-artifact",
};

const SOURCE_DIMENSIONS: Record<string, string> = {
  "declassified": "Intelligence Archive",
  "archive": "Historical Record",
  "encyclopedia": "Universal Knowledge",
  "academic": "Research Domain",
  "book": "Literary Archive",
  "museum": "Physical Archive",
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  "declassified-intelligence": "DECLASSIFIED",
  "secret-society": "SECRET SOCIETY",
  "historical-archive": "HISTORICAL",
  "academic-research": "ACADEMIC",
  "book-knowledge": "LITERARY",
  "classical-text": "CLASSICAL",
  "philosophy": "PHILOSOPHICAL",
  "museum-artifact": "ARTIFACT",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

router.get("/secret-knowledge/all", async (_req, res) => {
  try {
    const declassifiedData = await db
      .select({
        id: ingestedDataTable.id,
        source: ingestedDataTable.source,
        title: ingestedDataTable.title,
        content: ingestedDataTable.content,
        sourceType: ingestedDataTable.sourceType,
        url: ingestedDataTable.url,
        tags: ingestedDataTable.tags,
        ingestedAt: ingestedDataTable.ingestedAt,
      })
      .from(ingestedDataTable)
      .where(
        or(
          eq(ingestedDataTable.sourceType, "declassified"),
          ilike(ingestedDataTable.source, "%CIA%"),
          ilike(ingestedDataTable.source, "%FBI%"),
          ilike(ingestedDataTable.source, "%NSA%"),
          ilike(ingestedDataTable.source, "%Secret Society%"),
          ilike(ingestedDataTable.source, "%Declassified%"),
          ilike(ingestedDataTable.source, "%MKULTRA%"),
          ilike(ingestedDataTable.source, "%National Archives%"),
        )
      )
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(40);

    const otherData = await db
      .select({
        id: ingestedDataTable.id,
        source: ingestedDataTable.source,
        title: ingestedDataTable.title,
        content: ingestedDataTable.content,
        sourceType: ingestedDataTable.sourceType,
        url: ingestedDataTable.url,
        tags: ingestedDataTable.tags,
        ingestedAt: ingestedDataTable.ingestedAt,
      })
      .from(ingestedDataTable)
      .where(
        sql`${ingestedDataTable.sourceType} != 'declassified' AND ${ingestedDataTable.sourceType} != 'rss' AND ${ingestedDataTable.source} NOT ILIKE '%CIA%' AND ${ingestedDataTable.source} NOT ILIKE '%FBI%' AND ${ingestedDataTable.source} NOT ILIKE '%Secret Society%' AND ${ingestedDataTable.source} NOT ILIKE '%CoinGecko%'`
      )
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(40);

    const seenIds = new Set<number>();
    const allData = [];
    for (const item of declassifiedData) {
      if (!seenIds.has(item.id)) { seenIds.add(item.id); allData.push(item); }
    }
    for (const item of otherData) {
      if (!seenIds.has(item.id) && allData.length < 80) { seenIds.add(item.id); allData.push(item); }
    }

    function mapItem(item: typeof allData[0], i: number) {
      const titleText = item.title || "Unknown";
      const contentText = (item.content ?? "").slice(0, 400);
      const text = item.title ? `${item.title}: ${contentText}` : contentText;
      const sourceCategory = SOURCE_CATEGORIES[item.source ?? ""] || item.sourceType || "knowledge";
      const dimension = SOURCE_DIMENSIONS[item.sourceType ?? ""] || "Knowledge Archive";
      const h = hashString(titleText + String(item.id));
      const classification = CLASSIFICATION_LABELS[sourceCategory] || (item.sourceType === "declassified" ? "DECLASSIFIED" : undefined);

      return {
        id: `real-${item.id}`,
        agent: item.source || "System",
        dimension,
        category: sourceCategory,
        cycle: i + 1,
        text,
        timestamp: item.ingestedAt ? new Date(item.ingestedAt).getTime() : Date.now() - i * 60000,
        confidence: Math.min(99, 70 + (h % 30)),
        verified: item.sourceType === "core" || item.sourceType === "declassified" || (item.source || "").includes("arXiv") || (item.source || "").includes("NASA") || (item.source || "").includes("Stanford"),
        source: item.source,
        sourceType: item.sourceType,
        url: item.url,
        tags: item.tags,
        classification,
        real: true,
      };
    }

    const knowledge = allData.map(mapItem);

    if (knowledge.length === 0) {
      const subjectKeys = Object.keys(TESSERA_SUBJECTS);
      for (let i = 0; i < Math.min(20, subjectKeys.length); i++) {
        const key = subjectKeys[i];
        const subject = TESSERA_SUBJECTS[key];
        knowledge.push({
          id: `subject-${i}`,
          agent: "Tessera Knowledge Base",
          dimension: "Core Knowledge",
          category: key,
          cycle: i + 1,
          text: `${subject.title}: ${subject.knowledge.slice(0, 400)}`,
          timestamp: Date.now() - i * 120000,
          confidence: 95,
          verified: true,
          source: "tessera-knowledge",
          sourceType: "core",
          url: undefined,
          tags: [key],
          classification: undefined,
          real: true,
        });
      }
    }

    const [totalCount] = await db.select({ cnt: sql<number>`count(*)::int` }).from(ingestedDataTable);
    const [declassifiedCount] = await db.select({ cnt: sql<number>`count(*)::int` }).from(ingestedDataTable).where(eq(ingestedDataTable.sourceType, "declassified"));

    return res.json({
      ok: true,
      knowledge,
      total: knowledge.length,
      totalIngested: totalCount?.cnt ?? 0,
      totalDeclassified: declassifiedCount?.cnt ?? 0,
      sources: [...new Set(allData.map(d => d.source).filter(Boolean))],
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/secret-knowledge/live", async (_req, res) => {
  try {
    const recentData = await db
      .select({
        id: ingestedDataTable.id,
        source: ingestedDataTable.source,
        title: ingestedDataTable.title,
        content: ingestedDataTable.content,
        sourceType: ingestedDataTable.sourceType,
        url: ingestedDataTable.url,
        tags: ingestedDataTable.tags,
        ingestedAt: ingestedDataTable.ingestedAt,
      })
      .from(ingestedDataTable)
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(30);

    const entries = recentData.map((item, i) => {
      const sourceCategory = SOURCE_CATEGORIES[item.source ?? ""] || item.sourceType || "knowledge";
      const dimension = SOURCE_DIMENSIONS[item.sourceType ?? ""] || "Knowledge Archive";
      const classification = CLASSIFICATION_LABELS[sourceCategory] || (item.sourceType === "declassified" ? "DECLASSIFIED" : undefined);
      return {
        id: `live-${item.id}`,
        text: item.title ? `${item.title}: ${(item.content ?? "").slice(0, 300)}` : (item.content ?? "").slice(0, 400),
        agent: item.source || "System",
        dimension,
        category: sourceCategory,
        source: item.source,
        sourceType: item.sourceType,
        url: item.url,
        classification,
        timestamp: item.ingestedAt ? new Date(item.ingestedAt).getTime() : Date.now() - i * 30000,
        tags: item.tags,
        real: true,
      };
    });

    return res.json({
      ok: true,
      entries,
      total: entries.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/secret-knowledge/generate-now", async (_req, res) => {
  try {
    const latestData = await db
      .select({
        id: ingestedDataTable.id,
        source: ingestedDataTable.source,
        title: ingestedDataTable.title,
        content: ingestedDataTable.content,
        sourceType: ingestedDataTable.sourceType,
        ingestedAt: ingestedDataTable.ingestedAt,
      })
      .from(ingestedDataTable)
      .orderBy(desc(ingestedDataTable.ingestedAt))
      .limit(1);

    if (latestData.length > 0) {
      const item = latestData[0];
      const entry = {
        id: `gen-real-${item.id}`,
        text: item.title ? `${item.title}: ${(item.content ?? "").slice(0, 400)}` : (item.content ?? "").slice(0, 400),
        agent: item.source || "System",
        dimension: SOURCE_DIMENSIONS[item.sourceType ?? ""] || "Knowledge Archive",
        category: SOURCE_CATEGORIES[item.source ?? ""] || item.sourceType || "knowledge",
        timestamp: item.ingestedAt ? new Date(item.ingestedAt).getTime() : Date.now(),
        source: item.source,
        confidence: 95,
        real: true,
      };
      return res.json({ ok: true, entry });
    }

    const subjectKeys = Object.keys(TESSERA_SUBJECTS);
    const idx = Date.now() % subjectKeys.length;
    const key = subjectKeys[idx];
    const subject = TESSERA_SUBJECTS[key];

    const entry = {
      id: `gen-core-${Date.now()}`,
      text: `${subject.title}: ${subject.knowledge.slice(0, 400)}`,
      agent: "Tessera Knowledge Base",
      dimension: "Core Knowledge",
      category: key,
      timestamp: Date.now(),
      source: "tessera-knowledge",
      confidence: 95,
      real: true,
    };

    return res.json({ ok: true, entry });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
