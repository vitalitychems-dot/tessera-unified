import { db } from "@workspace/db";
import { ingestedDataTable } from "@workspace/db/schema";
import { desc, gt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { regenerateCanon } from "./canonUpdater";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

let lastBridgeCheckAt = new Date();
let bridgeInterval: SacredHandle | null = null;
let cumulativeNewItems = 0;
let bridgeRunning = false;
const REGEN_THRESHOLD = 25;

async function checkAndBridge(): Promise<void> {
  if (bridgeRunning) return;
  bridgeRunning = true;
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestedDataTable)
      .where(gt(ingestedDataTable.ingestedAt, lastBridgeCheckAt));

    const newCount = Number(rows[0]?.count ?? 0);
    cumulativeNewItems += newCount;
    lastBridgeCheckAt = new Date();

    if (cumulativeNewItems >= REGEN_THRESHOLD) {
      logger.info({ newItems: cumulativeNewItems }, "Knowledge-Canon bridge: threshold reached, regenerating canon");

      const recentItems = await db
        .select({ title: ingestedDataTable.title, source: ingestedDataTable.source, sourceType: ingestedDataTable.sourceType })
        .from(ingestedDataTable)
        .orderBy(desc(ingestedDataTable.ingestedAt))
        .limit(20);

      const sources = [...new Set(recentItems.map(i => i.source))];
      logger.info({ sources, recentTitles: recentItems.slice(0, 5).map(i => i.title) }, "Canon regeneration triggered by new knowledge");

      await regenerateCanon(`auto-knowledge-bridge: ${cumulativeNewItems} new items from ${sources.join(", ")}`);
      cumulativeNewItems = 0;

      logger.info("Canon regenerated with latest knowledge");
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Knowledge-Canon bridge check failed");
  } finally {
    bridgeRunning = false;
  }
}

export function startKnowledgeToCanonBridge(intervalMs = 900_000): void {
  if (bridgeInterval) return;

  bridgeInterval = setSacredInterval(() => {
    checkAndBridge().catch(e => logger.warn({ err: (e as Error).message }, "Bridge cycle error", "knowledge-canon-bridge"));
  }, intervalMs, "knowledge-canon-bridge");

  setTimeout(() => {
    checkAndBridge().catch(() => {});
  }, 60_000);

  logger.info({ intervalMs, threshold: REGEN_THRESHOLD }, "Knowledge-to-Canon bridge started");
}

export function stopKnowledgeToCanonBridge(): void {
  if (bridgeInterval) {
    clearSacredInterval(bridgeInterval);
    bridgeInterval = null;
  }
}

export function getBridgeStatus(): { lastCheck: string; cumulativeNew: number; threshold: number; active: boolean } {
  return {
    lastCheck: lastBridgeCheckAt.toISOString(),
    cumulativeNew: cumulativeNewItems,
    threshold: REGEN_THRESHOLD,
    active: bridgeInterval !== null,
  };
}
