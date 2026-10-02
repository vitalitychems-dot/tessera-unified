import { pgTable, serial, text, real, timestamp, jsonb, integer, boolean, uniqueIndex, index, varchar } from "drizzle-orm/pg-core";


export const semanticCacheTable = pgTable("semantic_cache", {
  id: serial("id").primaryKey(),
  promptHash: text("prompt_hash").notNull().unique(),
  promptText: text("prompt_text").notNull(),
  embedding: jsonb("embedding").$type<number[]>().default([]),
  response: text("response").notNull(),
  model: text("model").notNull().default("gpt-5-mini"),
  hitCount: integer("hit_count").notNull().default(0),
  ttlSeconds: integer("ttl_seconds").notNull().default(3600),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastHitAt: timestamp("last_hit_at"),
});

export const distilledKnowledgeTable = pgTable("distilled_knowledge", {
  id: serial("id").primaryKey(),
  // Nullable after compression: once a row has a canonicalId, fact is set to null
  // and the canonical store (knowledge_canonical.canonical_fact) is authoritative.
  fact: text("fact"),
  category: text("category").notNull().default("general"),
  source: text("source").notNull().default("llm"),
  sourcePrompt: text("source_prompt"),
  confidence: real("confidence").notNull().default(0.8),
  accessCount: integer("access_count").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at"),
  // Canonical pointer: set after compression pipeline runs; enforces single-storage
  // semantics — all rows sharing a canonicalId are represented by one canonical entry.
  canonicalId: integer("canonical_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const agentHierarchyTable = pgTable("agent_hierarchy", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  name: text("name").notNull(),
  parentAgent: text("parent_agent"),
  tier: text("tier").notNull().default("council"),
  shift: text("shift"),
  status: text("status").notNull().default("active"),
  domain: text("domain").notNull().default("general"),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  taskHistory: jsonb("task_history").$type<Array<{ task: string; completedAt: number; success: boolean }>>().default([]),
  performanceMetrics: jsonb("performance_metrics").$type<{ tasksCompleted: number; successRate: number; avgResponseMs: number; ethicsScore: number }>().default({ tasksCompleted: 0, successRate: 1.0, avgResponseMs: 0, ethicsScore: 95 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const councilConfigTable = pgTable("council_config_changes", {
  id: serial("id").primaryKey(),
  proposalId: text("proposal_id").notNull(),
  subsystem: text("subsystem").notNull(),
  parameter: text("parameter").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value").notNull(),
  category: text("category").notNull().default("general"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
});

export const tuningDecisionsTable = pgTable("tuning_decisions", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull(),
  parameter: text("parameter").notNull(),
  oldValue: real("old_value").notNull(),
  newValue: real("new_value").notNull(),
  reason: text("reason").notNull(),
  cycleNumber: integer("cycle_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const selfEvaluationTable = pgTable("self_evaluation_history", {
  id: serial("id").primaryKey(),
  cycleNumber: integer("cycle_number").notNull(),
  overallScore: real("overall_score").notNull(),
  cacheHitRate: real("cache_hit_rate").notNull().default(0),
  knowledgeHitRate: real("knowledge_hit_rate").notNull().default(0),
  embeddingQuality: real("embedding_quality").notNull().default(0),
  llmCallsReduced: integer("llm_calls_reduced").notNull().default(0),
  sourceScores: jsonb("source_scores").$type<Record<string, number>>().default({}),
  adjustments: jsonb("adjustments").$type<Record<string, unknown>>().default({}),
  weakAreas: jsonb("weak_areas").$type<string[]>().default([]),
  strongAreas: jsonb("strong_areas").$type<string[]>().default([]),
  evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
});

export const knowledgeCanonicalTable = pgTable("knowledge_canonical", {
  id: serial("id").primaryKey(),
  canonicalFact: text("canonical_fact").notNull(),
  encodedFact: text("encoded_fact"),
  encodedDictRunId: text("encoded_dict_run_id"),
  embedding: jsonb("embedding").$type<number[]>().default([]),
  domains: jsonb("domains").$type<string[]>().default([]),
  sourceIds: jsonb("source_ids").$type<number[]>().default([]),
  confidence: real("confidence").notNull().default(0.8),
  compressionRatio: real("compression_ratio").notNull().default(1.0),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const compressionRunTable = pgTable("compression_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  totalInputFacts: integer("total_input_facts").notNull().default(0),
  totalCanonicalFacts: integer("total_canonical_facts").notNull().default(0),
  duplicatesRemoved: integer("duplicates_removed").notNull().default(0),
  originalBytes: integer("original_bytes").notNull().default(0),
  compressedBytes: integer("compressed_bytes").notNull().default(0),
  compressionRatio: real("compression_ratio").notNull().default(1.0),
  avgRetrievalMs: real("avg_retrieval_ms").notNull().default(0),
  portalJumpEntries: integer("portal_jump_entries").notNull().default(0),
  dictionarySize: integer("dictionary_size").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  dictionaryData: jsonb("dictionary_data").$type<Array<{ phrase: string; token: string }>>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
