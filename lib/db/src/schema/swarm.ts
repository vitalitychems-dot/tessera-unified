import { pgTable, serial, text, real, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const swarmTasksTable = pgTable("swarm_tasks", {
  id: serial("id").primaryKey(),
  taskId: text("task_id").notNull().unique(),
  task: text("task").notNull(),
  status: text("status").notNull().default("complete"),
  selectedDomains: jsonb("selected_domains").$type<string[]>().notNull().default([]),
  agentResults: jsonb("agent_results").$type<any[]>().notNull().default([]),
  metaReport: jsonb("meta_report").$type<any>().default(null),
  finalAnswer: text("final_answer"),
  agentCount: integer("agent_count").notNull().default(0),
  overallQuality: real("overall_quality"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSwarmTaskSchema = createInsertSchema(swarmTasksTable).omit({ id: true, createdAt: true });
export type InsertSwarmTask = z.infer<typeof insertSwarmTaskSchema>;
export type SwarmTaskRow = typeof swarmTasksTable.$inferSelect;

export const swarmReasoningTracesTable = pgTable("swarm_reasoning_traces", {
  id: serial("id").primaryKey(),
  taskId: text("task_id").notNull(),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  domain: text("domain").notNull(),
  phase: text("phase").notNull(),
  content: text("content").notNull(),
  quality: real("quality"),
  selfAssessmentScore: real("self_assessment_score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSwarmReasoningTraceSchema = createInsertSchema(swarmReasoningTracesTable).omit({ id: true, createdAt: true });
export type InsertSwarmReasoningTrace = z.infer<typeof insertSwarmReasoningTraceSchema>;
export type SwarmReasoningTraceRow = typeof swarmReasoningTracesTable.$inferSelect;
