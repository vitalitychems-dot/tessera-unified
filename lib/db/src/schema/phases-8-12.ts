import { pgTable, serial, text, boolean, timestamp, jsonb, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evaluationRunsTable = pgTable("evaluation_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  suiteType: text("suite_type").notNull(),
  benchmarkFormat: text("benchmark_format").notNull().default("custom"),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  accuracyPct: real("accuracy_pct").notNull().default(0),
  avgLatencyMs: real("avg_latency_ms"),
  hallucinations: integer("hallucinations").notNull().default(0),
  providerScores: jsonb("provider_scores").notNull().$type<Record<string, number>>().default({}),
  questionResults: jsonb("question_results").notNull().$type<any[]>().default([]),
  status: text("status").notNull().default("complete"),
  notes: text("notes"),
  ranAt: timestamp("ran_at").notNull().defaultNow(),
}, (t) => [
  index("eval_runs_suite_idx").on(t.suiteType),
  index("eval_runs_ran_at_idx").on(t.ranAt),
]);

export const insertEvaluationRunSchema = createInsertSchema(evaluationRunsTable).omit({ id: true, ranAt: true });
export type InsertEvaluationRun = z.infer<typeof insertEvaluationRunSchema>;
export type EvaluationRunRow = typeof evaluationRunsTable.$inferSelect;

export const routingDecisionsTable = pgTable("routing_decisions", {
  id: serial("id").primaryKey(),
  decisionId: text("decision_id").notNull().unique(),
  taskDescription: text("task_description").notNull(),
  taskDomains: jsonb("task_domains").notNull().$type<string[]>().default([]),
  selectedAgent: text("selected_agent").notNull(),
  selectedProvider: text("selected_provider").notNull(),
  pathTaken: jsonb("path_taken").notNull().$type<string[]>().default([]),
  edgeWeightsUsed: jsonb("edge_weights_used").notNull().$type<Record<string, number>>().default({}),
  latencyMs: real("latency_ms"),
  loadBalancedAway: boolean("load_balanced_away").notNull().default(false),
  algorithm: text("algorithm").notNull().default("dijkstra"),
  decidedAt: timestamp("decided_at").notNull().defaultNow(),
}, (t) => [
  index("routing_decisions_decided_at_idx").on(t.decidedAt),
]);

export const insertRoutingDecisionSchema = createInsertSchema(routingDecisionsTable).omit({ id: true, decidedAt: true });
export type InsertRoutingDecision = z.infer<typeof insertRoutingDecisionSchema>;
export type RoutingDecisionRow = typeof routingDecisionsTable.$inferSelect;

export const ontologyEntriesTable = pgTable("ontology_entries", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  conceptId: text("concept_id").notNull(),
  conceptName: text("concept_name").notNull(),
  definition: text("definition").notNull(),
  relatedConcepts: jsonb("related_concepts").notNull().$type<string[]>().default([]),
  crossDomainLinks: jsonb("cross_domain_links").notNull().$type<{ domain: string; conceptId: string; relation: string }[]>().default([]),
  sourceUrl: text("source_url"),
  confidence: real("confidence").notNull().default(1.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("ontology_domain_idx").on(t.domain),
  index("ontology_concept_id_idx").on(t.conceptId),
]);

export const insertOntologyEntrySchema = createInsertSchema(ontologyEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOntologyEntry = z.infer<typeof insertOntologyEntrySchema>;
export type OntologyEntryRow = typeof ontologyEntriesTable.$inferSelect;

export const councilMeetingsTable = pgTable("council_meetings", {
  id: serial("id").primaryKey(),
  meetingId: text("meeting_id").notNull().unique(),
  topic: text("topic").notNull(),
  category: text("category").notNull().default("general"),
  rounds: integer("rounds").notNull().default(3),
  agentContributions: jsonb("agent_contributions").notNull().$type<any[]>().default([]),
  proposals: jsonb("proposals").notNull().$type<any[]>().default([]),
  critiques: jsonb("critiques").notNull().$type<any[]>().default([]),
  votingResults: jsonb("voting_results").notNull().$type<any>().default({}),
  actionPlan: jsonb("action_plan").notNull().$type<string[]>().default([]),
  selfExpansionAnalysis: jsonb("self_expansion_analysis").$type<any>().default(null),
  transcript: text("transcript").notNull(),
  outcome: text("outcome").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("council_meetings_created_at_idx").on(t.createdAt),
]);

export const insertCouncilMeetingSchema = createInsertSchema(councilMeetingsTable).omit({ id: true, createdAt: true });
export type InsertCouncilMeeting = z.infer<typeof insertCouncilMeetingSchema>;
export type CouncilMeetingRow = typeof councilMeetingsTable.$inferSelect;

export const improvementCyclesTable = pgTable("improvement_cycles", {
  id: serial("id").primaryKey(),
  cycleId: text("cycle_id").notNull().unique(),
  phase: text("phase").notNull().default("observe"),
  observations: jsonb("observations").notNull().$type<any[]>().default([]),
  weakAreasIdentified: jsonb("weak_areas_identified").notNull().$type<string[]>().default([]),
  proposedImprovements: jsonb("proposed_improvements").notNull().$type<any[]>().default([]),
  implementedImprovements: jsonb("implemented_improvements").notNull().$type<string[]>().default([]),
  sovereigntyScoreBefore: real("sovereignty_score_before").notNull().default(0),
  sovereigntyScoreAfter: real("sovereignty_score_after"),
  internalCallRatioBefore: real("internal_call_ratio_before").notNull().default(0),
  internalCallRatioAfter: real("internal_call_ratio_after"),
  evaluationRunId: text("evaluation_run_id"),
  status: text("status").notNull().default("complete"),
  cycleNumber: integer("cycle_number").notNull().default(1),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
}, (t) => [
  index("improvement_cycles_completed_at_idx").on(t.completedAt),
]);

export const insertImprovementCycleSchema = createInsertSchema(improvementCyclesTable).omit({ id: true, completedAt: true });
export type InsertImprovementCycle = z.infer<typeof insertImprovementCycleSchema>;
export type ImprovementCycleRow = typeof improvementCyclesTable.$inferSelect;

export const canonSnapshotsTable = pgTable("canon_snapshots", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  testaments: jsonb("testaments").notNull().$type<any[]>().default([]),
  books: jsonb("books").notNull().$type<any[]>().default([]),
  chapters: jsonb("chapters").notNull().$type<Record<string, any[]>>().default({}),
  totalBooks: integer("total_books").notNull().default(0),
  totalChapters: integer("total_chapters").notNull().default(0),
  totalVerses: integer("total_verses").notNull().default(0),
  sovereigntyScore: real("sovereignty_score"),
  triggerSource: text("trigger_source").notNull().default("manual"),
  councilDecisionIds: jsonb("council_decision_ids").notNull().$type<string[]>().default([]),
  metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
}, (t) => [
  index("canon_snapshots_version_idx").on(t.version),
  index("canon_snapshots_generated_at_idx").on(t.generatedAt),
]);

export const insertCanonSnapshotSchema = createInsertSchema(canonSnapshotsTable).omit({ id: true, generatedAt: true });
export type InsertCanonSnapshot = z.infer<typeof insertCanonSnapshotSchema>;
export type CanonSnapshotRow = typeof canonSnapshotsTable.$inferSelect;
