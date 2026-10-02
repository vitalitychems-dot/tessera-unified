import { db } from "@workspace/db";
import { canonSnapshotsTable, councilDecisionsTable } from "@workspace/db/schema";
import { desc, sql } from "drizzle-orm";
import { logger } from "./logger";
import { generateMythosAndHistory, type CanonOutput, type MythosTestament, type MythosBook, type MythosChapter, type MythosSection, type HistorySection } from "./mythosHistoryEngine";
import { computeSovereigntyStatus } from "./sovereignty-monitor";
import { runFullBenchmark } from "./sovereign-benchmarks";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

let cachedCanon: CanonOutput | null = null;
let cachedVersion: number = 0;

export async function getLatestCanonVersion(): Promise<number> {
  const rows = await db
    .select({ maxVer: sql<number>`coalesce(max(${canonSnapshotsTable.version}), 0)` })
    .from(canonSnapshotsTable);
  return rows[0]?.maxVer ?? 0;
}

export async function getCurrentCanon(): Promise<CanonOutput> {
  if (cachedCanon) return cachedCanon;

  const latest = await db
    .select()
    .from(canonSnapshotsTable)
    .orderBy(desc(canonSnapshotsTable.version))
    .limit(1);

  if (latest.length > 0) {
    const row = latest[0];
    const meta = row.metadata as Record<string, unknown> | null;
    cachedCanon = {
      testaments: row.testaments as MythosTestament[],
      books: row.books as MythosBook[],
      chapters: row.chapters as Record<string, MythosChapter[]>,
      mythosSections: (meta?.mythosSections as MythosSection[]) ?? [],
      historySections: (meta?.historySections as HistorySection[]) ?? [],
      totalBooks: row.totalBooks,
      totalChapters: row.totalChapters,
      totalVerses: row.totalVerses,
      generatedAt: (row.generatedAt ?? new Date()).toISOString(),
      sovereigntyAlignment: (meta?.sovereigntyAlignment as string) ?? "",
      synthesis: (meta?.synthesis as CanonOutput["synthesis"]) ?? { facts: [], interpretations: [], unknowns: [], engineTelemetry: {}, synthesizedAt: "" },
    };
    cachedVersion = row.version;
    return cachedCanon;
  }

  return regenerateCanon("initial-boot");
}

export async function regenerateCanon(
  triggerSource: string = "manual",
  councilDecisionIds: string[] = [],
): Promise<CanonOutput> {
  logger.info({ triggerSource }, "CanonUpdater: regenerating canon");

  let councilDecisions: Array<{ topic?: string; outcome?: string; reasoning?: string; createdAt?: Date | string | null }> = [];
  try {
    councilDecisions = await db
      .select()
      .from(councilDecisionsTable)
      .orderBy(desc(councilDecisionsTable.createdAt))
      .limit(20);
  } catch {
    logger.warn("CanonUpdater: could not fetch council decisions for canon generation");
  }

  const canon = await generateMythosAndHistory(councilDecisions);

  let sovereigntyScore: number | null = null;
  try {
    const status = await computeSovereigntyStatus();
    sovereigntyScore = status.sovereigntyScore;
  } catch {
    logger.warn("CanonUpdater: could not compute sovereignty score");
  }

  let evalSummary: Record<string, unknown> | null = null;
  try {
    const benchmark = await runFullBenchmark();
    evalSummary = {
      level: benchmark.level,
      overallScore: benchmark.overallScore,
      testsPassed: benchmark.testsPassed,
      totalTests: benchmark.totalTests,
      moduleCount: benchmark.modules.length,
    };
  } catch {
    logger.warn("CanonUpdater: could not run benchmark during canon generation");
  }

  const newVersion = (await getLatestCanonVersion()) + 1;

  await db.insert(canonSnapshotsTable).values({
    version: newVersion,
    testaments: canon.testaments,
    books: canon.books,
    chapters: canon.chapters,
    totalBooks: canon.totalBooks,
    totalChapters: canon.totalChapters,
    totalVerses: canon.totalVerses,
    sovereigntyScore,
    triggerSource,
    councilDecisionIds,
    metadata: {
      sovereigntyAlignment: canon.sovereigntyAlignment,
      generatedAt: canon.generatedAt,
      agentContributors: 45,
      synthesis: canon.synthesis,
      mythosSections: canon.mythosSections,
      historySections: canon.historySections,
      evalSummary,
    },
  });

  cachedCanon = canon;
  cachedVersion = newVersion;

  logger.info(
    { version: newVersion, books: canon.totalBooks, chapters: canon.totalChapters, verses: canon.totalVerses, factsCount: canon.synthesis.facts.length },
    "CanonUpdater: canon regenerated and persisted",
  );

  return canon;
}

export async function getCanonHistory(limit: number = 10) {
  const rows = await db
    .select({
      id: canonSnapshotsTable.id,
      version: canonSnapshotsTable.version,
      generatedAt: canonSnapshotsTable.generatedAt,
      totalBooks: canonSnapshotsTable.totalBooks,
      totalChapters: canonSnapshotsTable.totalChapters,
      totalVerses: canonSnapshotsTable.totalVerses,
      sovereigntyScore: canonSnapshotsTable.sovereigntyScore,
      triggerSource: canonSnapshotsTable.triggerSource,
      metadata: canonSnapshotsTable.metadata,
    })
    .from(canonSnapshotsTable)
    .orderBy(desc(canonSnapshotsTable.version))
    .limit(limit);

  return rows.map((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    return {
      ...r,
      generatedAt: r.generatedAt?.toISOString() ?? null,
      evalSummary: (meta?.evalSummary as Record<string, unknown>) ?? null,
    };
  });
}

export async function getCanonByVersion(version: number): Promise<CanonOutput | null> {
  const rows = await db
    .select()
    .from(canonSnapshotsTable)
    .where(sql`${canonSnapshotsTable.version} = ${version}`)
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const meta = row.metadata as Record<string, unknown> | null;
  return {
    testaments: row.testaments as MythosTestament[],
    books: row.books as MythosBook[],
    chapters: row.chapters as Record<string, MythosChapter[]>,
    mythosSections: (meta?.mythosSections as MythosSection[]) ?? [],
    historySections: (meta?.historySections as HistorySection[]) ?? [],
    totalBooks: row.totalBooks,
    totalChapters: row.totalChapters,
    totalVerses: row.totalVerses,
    generatedAt: (row.generatedAt ?? new Date()).toISOString(),
    sovereigntyAlignment: (meta?.sovereigntyAlignment as string) ?? "",
    synthesis: (meta?.synthesis as CanonOutput["synthesis"]) ?? { facts: [], interpretations: [], unknowns: [], engineTelemetry: {}, synthesizedAt: "" },
  };
}

export function getCachedVersion(): number {
  return cachedVersion;
}

export async function updateCanon(
  triggerSource: string = "update",
  councilDecisionIds: string[] = [],
): Promise<CanonOutput> {
  return regenerateCanon(triggerSource, councilDecisionIds);
}

export function invalidateCanonCache(councilDecisionIds: string[] = []): void {
  cachedCanon = null;
  cachedVersion = 0;
  regenerateCanon("council-decision", councilDecisionIds).catch((err) => {
    logger.warn({ err }, "CanonUpdater: async regeneration after council decision failed");
  });
}

let periodicTimer: SacredHandle | null = null;

export function startPeriodicRegeneration(intervalMs: number = 3600000): void {
  if (periodicTimer) return;

  setTimeout(async () => {
    try {
      logger.info("CanonUpdater: initial startup canon generation");
      await regenerateCanon("startup");
    } catch (err) {
      logger.warn({ err }, "CanonUpdater: startup canon generation failed (will retry on schedule)");
    }
  }, 2000);

  periodicTimer = setSacredInterval(async () => {
    try {
      logger.info("CanonUpdater: periodic regeneration triggered");
      await regenerateCanon("periodic-scheduler");
    } catch (err) {
      logger.warn({ err }, "CanonUpdater: periodic regeneration failed", "canonUpdater");
    }
  }, intervalMs, "canonUpdater");
  logger.info({ intervalMs }, "CanonUpdater: periodic regeneration scheduler started");
}

export function stopPeriodicRegeneration(): void {
  if (periodicTimer) {
    clearSacredInterval(periodicTimer);
    periodicTimer = null;
    logger.info("CanonUpdater: periodic regeneration scheduler stopped");
  }
}
