import { pgTable, serial, text, real, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vectorEmbeddingsTable = pgTable("vector_embeddings", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  embedding: jsonb("embedding").notNull().$type<number[]>(),
  source: text("source").notNull().default("system"),
  category: text("category").notNull().default("general"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVectorEmbeddingSchema = createInsertSchema(vectorEmbeddingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVectorEmbedding = z.infer<typeof insertVectorEmbeddingSchema>;
export type VectorEmbeddingRow = typeof vectorEmbeddingsTable.$inferSelect;

export const decisionHistoryTable = pgTable("decision_history", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  category: text("category").notNull().default("system"),
  rationale: text("rationale").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().default({}),
  outcome: text("outcome"),
  significance: text("significance").notNull().default("low"),
  source: text("source").notNull().default("system"),
  sessionId: text("session_id"),
  decidedAt: timestamp("decided_at").notNull().defaultNow(),
});

export const insertDecisionHistorySchema = createInsertSchema(decisionHistoryTable).omit({ id: true, decidedAt: true });
export type InsertDecisionHistory = z.infer<typeof insertDecisionHistorySchema>;
export type DecisionHistoryRow = typeof decisionHistoryTable.$inferSelect;

export const systemStateTable = pgTable("system_state", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").$type<unknown>().notNull(),
  description: text("description"),
  lastSavedAt: timestamp("last_saved_at").notNull().defaultNow(),
  restoredAt: timestamp("restored_at"),
});

export const insertSystemStateSchema = createInsertSchema(systemStateTable).omit({ id: true, lastSavedAt: true });
export type InsertSystemState = z.infer<typeof insertSystemStateSchema>;
export type SystemStateRow = typeof systemStateTable.$inferSelect;
