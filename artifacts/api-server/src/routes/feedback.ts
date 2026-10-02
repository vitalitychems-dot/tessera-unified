import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messageFeedbackTable } from "@workspace/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  try {
    const {
      conversationId,
      messageId,
      clientMsgKey,
      rating,
      reason,
      userQuery,
      responseExcerpt,
      modelTier,
      routerReason,
      metadata,
    } = req.body || {};

    if (!rating || !["up", "down"].includes(String(rating))) {
      return res.status(400).json({ error: "rating must be 'up' or 'down'" });
    }

    const [row] = await db.insert(messageFeedbackTable).values({
      conversationId: conversationId ? Number(conversationId) : null,
      messageId: messageId ? Number(messageId) : null,
      clientMsgKey: clientMsgKey ? String(clientMsgKey) : null,
      rating: String(rating),
      reason: reason ? String(reason).slice(0, 1000) : null,
      userQuery: userQuery ? String(userQuery).slice(0, 2000) : null,
      responseExcerpt: responseExcerpt ? String(responseExcerpt).slice(0, 4000) : null,
      modelTier: modelTier ? String(modelTier) : null,
      routerReason: routerReason ? String(routerReason) : null,
      metadata: metadata || null,
    }).returning();

    if (rating === "down") {
      try {
        const { invalidateRelatedEntries } = await import("../lib/semantic-cache");
        if (userQuery) {
          const keywords = String(userQuery).toLowerCase().split(/\s+/).filter((w: string) => w.length > 3).slice(0, 8);
          if (keywords.length > 0) await invalidateRelatedEntries(keywords);
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "feedback: cache invalidation skipped");
      }
    }

    if (rating === "up" && responseExcerpt && userQuery) {
      try {
        const { distillFromResponse } = await import("../lib/knowledge-distillation");
        await distillFromResponse(String(responseExcerpt), String(userQuery));
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "feedback: distillation skipped");
      }
    }

    return res.json({ ok: true, id: row.id });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "feedback: insert failed");
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/feedback/stats", async (_req, res) => {
  try {
    const rows = await db.select({
      rating: messageFeedbackTable.rating,
      count: sql<number>`count(*)::int`,
    }).from(messageFeedbackTable).groupBy(messageFeedbackTable.rating);

    const recent = await db.select().from(messageFeedbackTable)
      .orderBy(desc(messageFeedbackTable.createdAt))
      .limit(20);

    const stats: Record<string, number> = { up: 0, down: 0 };
    for (const r of rows) stats[r.rating] = r.count;
    const total = stats.up + stats.down;
    const satisfaction = total > 0 ? stats.up / total : null;

    return res.json({ stats, total, satisfaction, recent });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/feedback/by-conversation/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "invalid id" });
    const rows = await db.select().from(messageFeedbackTable)
      .where(eq(messageFeedbackTable.conversationId, id))
      .orderBy(desc(messageFeedbackTable.createdAt));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
