import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const messageFeedbackTable = pgTable("message_feedback", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id"),
  messageId: integer("message_id"),
  clientMsgKey: text("client_msg_key"),
  rating: text("rating").notNull(),
  reason: text("reason"),
  userQuery: text("user_query"),
  responseExcerpt: text("response_excerpt"),
  modelTier: text("model_tier"),
  routerReason: text("router_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MessageFeedbackRow = typeof messageFeedbackTable.$inferSelect;
export type InsertMessageFeedback = typeof messageFeedbackTable.$inferInsert;

export const modelRoutingLogTable = pgTable("model_routing_log", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  modelTier: text("model_tier").notNull(),
  modelName: text("model_name").notNull(),
  reason: text("reason"),
  estimatedTokens: integer("estimated_tokens"),
  actualLatencyMs: integer("actual_latency_ms"),
  cacheHit: integer("cache_hit").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ModelRoutingLogRow = typeof modelRoutingLogTable.$inferSelect;
