import { pgTable, serial, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("reasoning_goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(5),
  subTasks: jsonb("sub_tasks").notNull().default([]),
  dependencies: jsonb("dependencies").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type GoalRow = typeof goalsTable.$inferSelect;

export const reasoningTracesTable = pgTable("reasoning_traces", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  title: text("title").notNull(),
  query: text("query").notNull(),
  steps: jsonb("steps").notNull().default([]),
  conclusion: text("conclusion"),
  model: text("model").notNull().default("claude-sonnet-4-20250514"),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertReasoningTraceSchema = createInsertSchema(reasoningTracesTable).omit({ id: true, createdAt: true });
export type InsertReasoningTrace = z.infer<typeof insertReasoningTraceSchema>;
export type ReasoningTraceRow = typeof reasoningTracesTable.$inferSelect;

export const generatedCodeTable = pgTable("generated_code", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id"),
  description: text("description").notNull(),
  language: text("language").notNull().default("typescript"),
  code: text("code").notNull(),
  tests: text("tests"),
  executionResult: jsonb("execution_result"),
  model: text("model").notNull().default("claude-sonnet-4-20250514"),
  status: text("status").notNull().default("generated"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeneratedCodeSchema = createInsertSchema(generatedCodeTable).omit({ id: true, createdAt: true });
export type InsertGeneratedCode = z.infer<typeof insertGeneratedCodeSchema>;
export type GeneratedCodeRow = typeof generatedCodeTable.$inferSelect;

export const causalModelsTable = pgTable("causal_models", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  counterfactuals: jsonb("counterfactuals").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCausalModelSchema = createInsertSchema(causalModelsTable).omit({ id: true, createdAt: true });
export type InsertCausalModel = z.infer<typeof insertCausalModelSchema>;
export type CausalModelRow = typeof causalModelsTable.$inferSelect;

export const selfCritiqueLogTable = pgTable("self_critique_log", {
  id: serial("id").primaryKey(),
  userQuery: text("user_query").notNull(),
  finalResponse: text("final_response").notNull(),
  attempts: integer("attempts").notNull().default(1),
  passed: boolean("passed").notNull().default(false),
  groundingScore: integer("grounding_score_x1000").notNull().default(0),
  truthfulnessScore: integer("truthfulness_score_x1000").notNull().default(0),
  hallucinationSeverity: text("hallucination_severity").notNull().default("none"),
  sources: jsonb("sources").notNull().default([]),
  verdict: text("verdict").notNull().default("safe"),
  attemptHistory: jsonb("attempt_history").notNull().default([]),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SelfCritiqueLogRow = typeof selfCritiqueLogTable.$inferSelect;
