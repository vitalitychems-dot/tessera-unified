import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { dataSourcesTable, ingestionJobsTable, ingestedDataTable } from "@workspace/db/schema";
import { desc, eq, ilike, and, or, sql } from "drizzle-orm";
import {
  runIngestionForSource,
  runAllIngestion,
  runDueIngestion,
  getSourceHandlers,
  runRssIngestion,
  getSchedulerStatus,
  pauseScheduler,
  resumeScheduler,
  forceRunScheduler,
  harvestLinksFromRecentIngestion,
} from "../lib/ingestion/scheduler";
import { ingestItem, runSourceIngestion } from "../lib/ingestion/pipeline";
import { deepCrawl } from "../lib/ingestion/scrapers";
import { fetchGithubTrendingRepos, fetchGithubOrg, fetchGithubTopic, fetchGithubReadme, fetchGithubRepoFiles } from "../lib/ingestion/github";
import { fetchDataGov, fetchWorldBankData, fetchUNData, fetchGithubPublicDatasets } from "../lib/ingestion/datasets";
import { getShepherdStatus, runShepherdCycle } from "../lib/ingestion/shepherd-agents";
import { getBridgeStatus } from "../lib/knowledge-canon-bridge";

const router: IRouter = Router();

router.get("/ingestion/sources", async (_req, res) => {
  try {
    const sources = await db
      .select()
      .from(dataSourcesTable)
      .orderBy(desc(dataSourcesTable.updatedAt));
    return res.json({ ok: true, sources });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/sources", async (req, res) => {
  try {
    const { name, type, url, config, intervalSeconds, enabled } = req.body as {
      name: string;
      type: string;
      url?: string;
      config?: Record<string, unknown>;
      intervalSeconds?: number;
      enabled?: boolean;
    };
    if (!name || !type) {
      return res.status(400).json({ ok: false, error: "name and type are required" });
    }
    const [source] = await db.insert(dataSourcesTable).values({
      name,
      type,
      url: url ?? null,
      config: config ?? {},
      intervalSeconds: intervalSeconds ?? 3600,
      enabled: enabled ?? true,
    }).onConflictDoUpdate({
      target: dataSourcesTable.name,
      set: { type, url: url ?? null, config: config ?? {}, intervalSeconds: intervalSeconds ?? 3600, updatedAt: new Date() },
    }).returning();
    return res.json({ ok: true, source });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/ingestion/sources/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { enabled, intervalSeconds } = req.body as { enabled?: boolean; intervalSeconds?: number };
    const [source] = await db.update(dataSourcesTable)
      .set({ enabled, intervalSeconds, updatedAt: new Date() })
      .where(eq(dataSourcesTable.id, id))
      .returning();
    return res.json({ ok: true, source });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/ingestion/sources/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(dataSourcesTable).where(eq(dataSourcesTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/sources/available", async (_req, res) => {
  try {
    const handlers = getSourceHandlers();
    return res.json({ ok: true, sources: handlers });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/trigger/:sourceName", async (req, res) => {
  try {
    const { sourceName } = req.params;
    const result = await runIngestionForSource(decodeURIComponent(sourceName));
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/trigger-all", async (_req, res) => {
  try {
    const results = await runAllIngestion();
    return res.json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/trigger-due", async (_req, res) => {
  try {
    const results = await runDueIngestion();
    return res.json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/rss", async (req, res) => {
  try {
    const { name, url } = req.body as { name: string; url: string };
    if (!name || !url) {
      return res.status(400).json({ ok: false, error: "name and url are required" });
    }
    const result = await runRssIngestion(name, url);
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/ingest-item", async (req, res) => {
  try {
    const { source, sourceType, title, content, url, tags, metadata } = req.body;
    if (!source || !content) {
      return res.status(400).json({ ok: false, error: "source and content are required" });
    }
    const result = await ingestItem({ source, sourceType: sourceType || "manual", title, content, url, tags, metadata });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/jobs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const sourceName = req.query.source ? String(req.query.source) : undefined;

    let query = db.select().from(ingestionJobsTable).orderBy(desc(ingestionJobsTable.startedAt)).limit(limit);
    const jobs = await query;
    const filtered = sourceName ? jobs.filter(j => j.sourceName === sourceName) : jobs;
    return res.json({ ok: true, jobs: filtered, count: filtered.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/data", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
    const offset = parseInt(String(req.query.offset ?? "0"), 10);
    const source = req.query.source ? String(req.query.source) : undefined;
    const sourceType = req.query.sourceType ? String(req.query.sourceType) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const conditions = [];
    if (source) conditions.push(eq(ingestedDataTable.source, source));
    if (sourceType) conditions.push(eq(ingestedDataTable.sourceType, sourceType));
    if (search) conditions.push(
      or(
        ilike(ingestedDataTable.title, `%${search}%`),
        ilike(ingestedDataTable.content, `%${search}%`)
      )
    );

    const baseQuery = db.select({
      id: ingestedDataTable.id,
      source: ingestedDataTable.source,
      sourceType: ingestedDataTable.sourceType,
      title: ingestedDataTable.title,
      content: sql`LEFT(${ingestedDataTable.content}, 500)`,
      url: ingestedDataTable.url,
      tags: ingestedDataTable.tags,
      metadata: ingestedDataTable.metadata,
      ingestedAt: ingestedDataTable.ingestedAt,
      publishedAt: ingestedDataTable.publishedAt,
    }).from(ingestedDataTable).orderBy(desc(ingestedDataTable.ingestedAt)).limit(limit).offset(offset);

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

    const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(ingestedDataTable);
    return res.json({ ok: true, data: rows, count: rows.length, total: Number(countResult?.count ?? 0) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/data/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [row] = await db.select().from(ingestedDataTable).where(eq(ingestedDataTable.id, id)).limit(1);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    return res.json({ ok: true, data: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/ingestion/data/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(ingestedDataTable).where(eq(ingestedDataTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/stats", async (_req, res) => {
  try {
    const [totalResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(ingestedDataTable);
    const bySource = await db
      .select({ source: ingestedDataTable.source, count: sql<number>`COUNT(*)` })
      .from(ingestedDataTable)
      .groupBy(ingestedDataTable.source)
      .orderBy(desc(sql`COUNT(*)`));
    const byType = await db
      .select({ sourceType: ingestedDataTable.sourceType, count: sql<number>`COUNT(*)` })
      .from(ingestedDataTable)
      .groupBy(ingestedDataTable.sourceType);
    const sources = await db.select().from(dataSourcesTable).orderBy(desc(dataSourcesTable.updatedAt));
    const recentJobs = await db
      .select()
      .from(ingestionJobsTable)
      .orderBy(desc(ingestionJobsTable.startedAt))
      .limit(10);

    const [jobStats] = await db.select({
      totalJobs: sql<number>`COUNT(*)`,
      successJobs: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      failedJobs: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
    }).from(ingestionJobsTable);

    const shepherd = getShepherdStatus();
    const bridge = getBridgeStatus();
    const availableHandlers = getSourceHandlers();

    return res.json({
      ok: true,
      totalItems: Number(totalResult?.count ?? 0),
      bySource: bySource.map(r => ({ source: r.source, count: Number(r.count) })),
      byType: byType.map(r => ({ sourceType: r.sourceType, count: Number(r.count) })),
      sources,
      recentJobs,
      jobStats: {
        total: Number(jobStats?.totalJobs ?? 0),
        success: Number(jobStats?.successJobs ?? 0),
        failed: Number(jobStats?.failedJobs ?? 0),
      },
      totalSources: sources.length,
      enabledSources: sources.filter((s: any) => s.enabled).length,
      totalJobs: Number(jobStats?.totalJobs ?? 0),
      availableHandlers: availableHandlers.length,
      shepherd,
      bridge,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/crawl", async (req, res) => {
  try {
    const { url, maxDepth = 2, maxPages = 10, ingest = true } = req.body as {
      url: string;
      maxDepth?: number;
      maxPages?: number;
      ingest?: boolean;
    };
    if (!url) return res.status(400).json({ ok: false, error: "url is required" });

    const pages = await deepCrawl(url, { maxDepth, maxPages });

    if (ingest) {
      let ingested = 0;
      let skipped = 0;
      for (const page of pages) {
        const result = await ingestItem({
          source: new URL(url).hostname,
          sourceType: "web-crawl",
          title: page.title || page.url,
          content: page.content,
          url: page.url,
          tags: ["web-crawl", new URL(url).hostname],
          metadata: { depth: page.depth, linksFound: page.links.length, startUrl: url },
        }).catch(() => ({ ingested: false }));
        if (result.ingested) ingested++;
        else skipped++;
      }
      return res.json({ ok: true, pagesFound: pages.length, ingested, skipped });
    }

    return res.json({ ok: true, pages: pages.map(p => ({ url: p.url, title: p.title, contentLength: p.content.length, depth: p.depth })) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/github/repo", async (req, res) => {
  try {
    const { fullName, includeFiles = false } = req.body as { fullName: string; includeFiles?: boolean };
    if (!fullName) return res.status(400).json({ ok: false, error: "fullName is required" });

    const readme = await fetchGithubReadme(fullName);
    const ingestResult = await ingestItem({
      source: "GitHub",
      sourceType: "github",
      title: fullName,
      content: readme || `GitHub repository: ${fullName}`,
      url: `https://github.com/${fullName}`,
      tags: ["github", "repository"],
      metadata: { fullName, hasReadme: !!readme },
    });

    const fileResults: Array<{ ingested: boolean }> = [];
    if (includeFiles) {
      const files = await fetchGithubRepoFiles(fullName).catch(() => []);
      for (const file of files) {
        const r = await ingestItem(file).catch(() => ({ ingested: false }));
        fileResults.push(r);
      }
    }

    return res.json({
      ok: true,
      repoIngested: ingestResult.ingested,
      filesIngested: fileResults.filter(r => r.ingested).length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/github/search", async (req, res) => {
  try {
    const { query, type = "trending", limit = 8 } = req.body as { query?: string; type?: "trending" | "topic" | "org"; limit?: number };

    let items;
    if (type === "org" && query) {
      items = await fetchGithubOrg(query, limit);
    } else if (type === "topic" && query) {
      items = await fetchGithubTopic(query, limit);
    } else {
      items = await fetchGithubTrendingRepos(query || "", "weekly", limit);
    }

    const results = await runSourceIngestion("GitHub Search", null, async () => items);
    return res.json({ ok: true, ...results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/datasets/fetch", async (req, res) => {
  try {
    const { source, query, limit = 5 } = req.body as { source: string; query?: string; limit?: number };

    let items;
    if (source === "data.gov") {
      items = await fetchDataGov(query || "technology", limit);
    } else if (source === "worldbank") {
      items = await fetchWorldBankData(query || "NY.GDP.MKTP.CD", limit);
    } else if (source === "un-sdg") {
      items = await fetchUNData(query, limit);
    } else if (source === "github-datasets") {
      items = await fetchGithubPublicDatasets(query || "dataset", limit);
    } else {
      return res.status(400).json({ ok: false, error: "Unknown source. Use: data.gov, worldbank, un-sdg, github-datasets" });
    }

    const results = await runSourceIngestion(`Dataset:${source}`, null, async () => items);
    return res.json({ ok: true, ...results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/shepherd/status", (_req, res) => {
  return res.json({ ok: true, ...getShepherdStatus() });
});

router.post("/ingestion/shepherd/run", async (_req, res) => {
  try {
    const result = await runShepherdCycle();
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ingestion/bridge/status", (_req, res) => {
  return res.json({ ok: true, ...getBridgeStatus() });
});

router.get("/ingestion/scheduler/status", (_req, res) => {
  return res.json({ ok: true, ...getSchedulerStatus() });
});

router.post("/ingestion/scheduler/pause", (req, res) => {
  const { reason } = (req.body ?? {}) as { reason?: string };
  pauseScheduler(reason || "manual");
  return res.json({ ok: true, ...getSchedulerStatus() });
});

router.post("/ingestion/scheduler/resume", (_req, res) => {
  resumeScheduler();
  return res.json({ ok: true, ...getSchedulerStatus() });
});

router.post("/ingestion/scheduler/force-run", async (_req, res) => {
  try {
    const result = await forceRunScheduler();
    return res.json({ ok: true, ...result, status: getSchedulerStatus() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ingestion/scheduler/harvest-links", async (_req, res) => {
  try {
    const result = await harvestLinksFromRecentIngestion();
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
