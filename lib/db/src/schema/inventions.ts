import { pgTable, serial, text, real, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventionsTable = pgTable("inventions", {
  id: serial("id").primaryKey(),
  inventionId: text("invention_id").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default("technology"),
  difficulty: text("difficulty").notNull().default("Intermediate"),
  costEstimate: text("cost_estimate").notNull().default("Unknown"),
  timeEstimate: text("time_estimate").notNull().default("Unknown"),
  description: text("description").notNull(),
  howItHelps: text("how_it_helps").notNull().default(""),
  materials: jsonb("materials").$type<string[]>().notNull().default([]),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  scienceBehind: text("science_behind").notNull().default(""),
  status: text("status").notNull().default("proposed"),
  votes: jsonb("votes").$type<{ yes: number; no: number; abstain: number }>().notNull().default({ yes: 0, no: 0, abstain: 0 }),
  proposedBy: text("proposed_by").notNull().default("council"),
  feasibilityScore: real("feasibility_score").notNull().default(50),
  noveltyScore: real("novelty_score").notNull().default(50),
  buildProgress: real("build_progress").notNull().default(0),
  impact: text("impact").notNull().default(""),
  blueprint: text("blueprint"),
  supporters: jsonb("supporters").$type<string[]>().notNull().default([]),
  conferenceRound: integer("conference_round").notNull().default(1),
  customModelUrl: text("custom_model_url"),
  proposedAt: timestamp("proposed_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("inventions_category_idx").on(t.category),
  index("inventions_status_idx").on(t.status),
]);

export const insertInventionSchema = createInsertSchema(inventionsTable).omit({ id: true, proposedAt: true, updatedAt: true });
export type InsertInvention = z.infer<typeof insertInventionSchema>;
export type InventionRow = typeof inventionsTable.$inferSelect;

export const councilDecisionsTable = pgTable("council_decisions", {
  id: serial("id").primaryKey(),
  decisionId: text("decision_id").notNull().unique(),
  topic: text("topic").notNull(),
  transcript: text("transcript").notNull().default(""),
  decisionText: text("decision_text").notNull().default(""),
  voteTally: jsonb("vote_tally").$type<{ yes: number; no: number; abstain: number; totalEligible: number }>().notNull().default({ yes: 0, no: 0, abstain: 0, totalEligible: 45 }),
  outcome: text("outcome").notNull().default("pending"),
  agentsParticipated: jsonb("agents_participated").$type<string[]>().notNull().default([]),
  reasoning: text("reasoning").notNull().default(""),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("council_decisions_created_at_idx").on(t.createdAt),
  index("council_decisions_outcome_idx").on(t.outcome),
]);

export const insertCouncilDecisionSchema = createInsertSchema(councilDecisionsTable).omit({ id: true, createdAt: true });
export type InsertCouncilDecision = z.infer<typeof insertCouncilDecisionSchema>;
export type CouncilDecisionRow = typeof councilDecisionsTable.$inferSelect;

export const pinnedDiagramsTable = pgTable("pinned_diagrams", {
  id: serial("id").primaryKey(),
  diagramId: text("diagram_id").notNull().unique(),
  userId: text("user_id"),
  type: text("type").notNull().default("abstract"),
  label: text("label").notNull().default(""),
  color: text("color"),
  secondaryColor: text("secondary_color"),
  size: real("size"),
  detail: text("detail"),
  note: text("note"),
  sourceMessageId: text("source_message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("pinned_diagrams_user_idx").on(t.userId),
  index("pinned_diagrams_created_at_idx").on(t.createdAt),
]);

export const insertPinnedDiagramSchema = createInsertSchema(pinnedDiagramsTable).omit({ id: true, createdAt: true });
export type InsertPinnedDiagram = z.infer<typeof insertPinnedDiagramSchema>;
export type PinnedDiagramRow = typeof pinnedDiagramsTable.$inferSelect;
