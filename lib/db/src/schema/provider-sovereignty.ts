import { pgTable, serial, text, boolean, timestamp, jsonb, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerCallsTable = pgTable("provider_calls", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  model: text("model").notNull(),
  requestMessages: jsonb("request_messages").notNull().default([]),
  responseText: text("response_text"),
  latencyMs: integer("latency_ms"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  error: text("error"),
  status: text("status").notNull().default("success"),
  isExternal: boolean("is_external").notNull().default(true),
  isDryRun: boolean("is_dry_run").notNull().default(false),
  calledAt: timestamp("called_at").notNull().defaultNow(),
}, (t) => [
  index("provider_calls_provider_id_idx").on(t.providerId),
  index("provider_calls_called_at_idx").on(t.calledAt),
]);

export const insertProviderCallSchema = createInsertSchema(providerCallsTable).omit({ id: true, calledAt: true });
export type InsertProviderCall = z.infer<typeof insertProviderCallSchema>;
export type ProviderCallRow = typeof providerCallsTable.$inferSelect;

export const providerProfilesTable = pgTable("provider_profiles", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().unique(),
  providerName: text("provider_name").notNull(),
  isExternal: boolean("is_external").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  totalCalls: integer("total_calls").notNull().default(0),
  successCalls: integer("success_calls").notNull().default(0),
  errorCalls: integer("error_calls").notNull().default(0),
  avgLatencyMs: real("avg_latency_ms"),
  p95LatencyMs: real("p95_latency_ms"),
  errorRate: real("error_rate").notNull().default(0),
  avgInputTokens: real("avg_input_tokens"),
  avgOutputTokens: real("avg_output_tokens"),
  capabilities: jsonb("capabilities").notNull().default([]),
  strengths: jsonb("strengths").notNull().default([]),
  weaknesses: jsonb("weaknesses").notNull().default([]),
  models: jsonb("models").notNull().default([]),
  capabilityScore: real("capability_score").notNull().default(0),
  reliabilityScore: real("reliability_score").notNull().default(0),
  speedScore: real("speed_score").notNull().default(0),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("provider_profiles_provider_id_idx").on(t.providerId),
]);

export const insertProviderProfileSchema = createInsertSchema(providerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type ProviderProfileRow = typeof providerProfilesTable.$inferSelect;

export const sovereigntyMetricsTable = pgTable("sovereignty_metrics", {
  id: serial("id").primaryKey(),
  totalCalls: integer("total_calls").notNull().default(0),
  externalCalls: integer("external_calls").notNull().default(0),
  internalCalls: integer("internal_calls").notNull().default(0),
  internalRatio: real("internal_ratio").notNull().default(0),
  sovereigntyScore: real("sovereignty_score").notNull().default(0),
  detachmentReadiness: real("detachment_readiness").notNull().default(0),
  performanceParityScore: real("performance_parity_score").notNull().default(0),
  avgExternalLatencyMs: real("avg_external_latency_ms"),
  avgInternalLatencyMs: real("avg_internal_latency_ms"),
  activeProviders: integer("active_providers").notNull().default(0),
  externalProviders: integer("external_providers").notNull().default(0),
  internalProviders: integer("internal_providers").notNull().default(0),
  dryRunSimulated: boolean("dry_run_simulated").notNull().default(false),
  dryRunSuccessRate: real("dry_run_success_rate"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  index("sovereignty_metrics_computed_at_idx").on(t.computedAt),
]);

export const insertSovereigntyMetricsSchema = createInsertSchema(sovereigntyMetricsTable).omit({ id: true, computedAt: true });
export type InsertSovereigntyMetrics = z.infer<typeof insertSovereigntyMetricsSchema>;
export type SovereigntyMetricsRow = typeof sovereigntyMetricsTable.$inferSelect;

export const providerDiffsTable = pgTable("provider_diffs", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  providers: jsonb("providers").notNull().default([]),
  responses: jsonb("responses").notNull().default([]),
  similarityMatrix: jsonb("similarity_matrix").notNull().default({}),
  winnerProviderId: text("winner_provider_id"),
  scoringCriteria: text("scoring_criteria"),
  diffedAt: timestamp("diffed_at").notNull().defaultNow(),
}, (t) => [
  index("provider_diffs_diffed_at_idx").on(t.diffedAt),
]);

export const insertProviderDiffSchema = createInsertSchema(providerDiffsTable).omit({ id: true, diffedAt: true });
export type InsertProviderDiff = z.infer<typeof insertProviderDiffSchema>;
export type ProviderDiffRow = typeof providerDiffsTable.$inferSelect;

export const benchmarkRunsTable = pgTable("benchmark_runs", {
  id: serial("id").primaryKey(),
  runType: text("run_type").notNull().default("category"),
  overallScore: integer("overall_score"),
  grade: text("grade"),
  percentile: integer("percentile"),
  totalCalls: integer("total_calls").notNull().default(0),
  externalCalls: integer("external_calls").notNull().default(0),
  internalCalls: integer("internal_calls").notNull().default(0),
  activeProviders: integer("active_providers").notNull().default(0),
  heapUsedMb: integer("heap_used_mb"),
  heapTotalMb: integer("heap_total_mb"),
  uptimeSeconds: integer("uptime_seconds"),
  categoryResults: jsonb("category_results").notNull().default([]),
  dimensionResults: jsonb("dimension_results").notNull().default([]),
  verdict: text("verdict"),
  ranAt: timestamp("ran_at").notNull().defaultNow(),
}, (t) => [
  index("benchmark_runs_ran_at_idx").on(t.ranAt),
  index("benchmark_runs_run_type_idx").on(t.runType),
]);

export const insertBenchmarkRunSchema = createInsertSchema(benchmarkRunsTable).omit({ id: true, ranAt: true });
export type InsertBenchmarkRun = z.infer<typeof insertBenchmarkRunSchema>;
export type BenchmarkRunRow = typeof benchmarkRunsTable.$inferSelect;
