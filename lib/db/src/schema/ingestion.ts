import { pgTable, serial, text, real, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dataSourcesTable = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  url: text("url"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  enabled: boolean("enabled").notNull().default(true),
  intervalSeconds: integer("interval_seconds").notNull().default(3600),
  lastRunAt: timestamp("last_run_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastError: text("last_error"),
  totalRuns: integer("total_runs").notNull().default(0),
  totalIngested: integer("total_ingested").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDataSourceSchema = createInsertSchema(dataSourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSourceRow = typeof dataSourcesTable.$inferSelect;

export const ingestionJobsTable = pgTable("ingestion_jobs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => dataSourcesTable.id),
  sourceName: text("source_name").notNull(),
  status: text("status").notNull().default("pending"),
  itemsIngested: integer("items_ingested").notNull().default(0),
  itemsSkipped: integer("items_skipped").notNull().default(0),
  errors: jsonb("errors").$type<string[]>().default([]),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const insertIngestionJobSchema = createInsertSchema(ingestionJobsTable).omit({ id: true, startedAt: true });
export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;
export type IngestionJobRow = typeof ingestionJobsTable.$inferSelect;

export const ingestedDataTable = pgTable("ingested_data", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  sourceType: text("source_type").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  url: text("url"),
  contentHash: text("content_hash").notNull().unique(),
  embeddingId: integer("embedding_id"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  publishedAt: timestamp("published_at"),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
}, (t) => [
  index("ingested_data_source_idx").on(t.source),
  index("ingested_data_source_type_idx").on(t.sourceType),
  index("ingested_data_ingested_at_idx").on(t.ingestedAt),
]);

export const insertIngestedDataSchema = createInsertSchema(ingestedDataTable).omit({ id: true, ingestedAt: true });
export type InsertIngestedData = z.infer<typeof insertIngestedDataSchema>;
export type IngestedDataRow = typeof ingestedDataTable.$inferSelect;
