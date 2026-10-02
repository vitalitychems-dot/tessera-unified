import { pgTable, serial, text, real, timestamp, jsonb, integer, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  departmentId: text("department_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  leader: text("leader"),
  members: jsonb("members").$type<string[]>().notNull().default([]),
  performanceScore: real("performance_score").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("departments_name_idx").on(t.name),
]);

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type DepartmentRow = typeof departmentsTable.$inferSelect;

export const departmentPositionsTable = pgTable("department_positions", {
  id: serial("id").primaryKey(),
  positionId: text("position_id").notNull().unique(),
  departmentId: text("department_id").notNull(),
  title: text("title").notNull(),
  requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
  incumbent: text("incumbent"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("positions_dept_idx").on(t.departmentId),
  index("positions_status_idx").on(t.status),
]);

export const insertPositionSchema = createInsertSchema(departmentPositionsTable).omit({ id: true, createdAt: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type PositionRow = typeof departmentPositionsTable.$inferSelect;

export const abilityTestsTable = pgTable("ability_tests", {
  id: serial("id").primaryKey(),
  testId: text("test_id").notNull().unique(),
  departmentId: text("department_id").notNull(),
  positionId: text("position_id"),
  domain: text("domain").notNull(),
  challenges: jsonb("challenges").$type<{ question: string; weight: number }[]>().notNull().default([]),
  maxScore: real("max_score").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAbilityTestSchema = createInsertSchema(abilityTestsTable).omit({ id: true, createdAt: true });
export type InsertAbilityTest = z.infer<typeof insertAbilityTestSchema>;

export const testResultsTable = pgTable("test_results", {
  id: serial("id").primaryKey(),
  resultId: text("result_id").notNull().unique(),
  testId: text("test_id").notNull(),
  agentName: text("agent_name").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull().default(100),
  rank: integer("rank"),
  assessment: text("assessment").notNull().default(""),
  passed: boolean("passed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("results_agent_idx").on(t.agentName),
  index("results_test_idx").on(t.testId),
]);

export const insertTestResultSchema = createInsertSchema(testResultsTable).omit({ id: true, createdAt: true });
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResultRow = typeof testResultsTable.$inferSelect;

export const talentPoolTable = pgTable("talent_pool", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull().unique(),
  preferredRoles: jsonb("preferred_roles").$type<string[]>().notNull().default([]),
  topScores: jsonb("top_scores").$type<Record<string, number>>().notNull().default({}),
  available: boolean("available").notNull().default(true),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertTalentPoolSchema = createInsertSchema(talentPoolTable).omit({ id: true, addedAt: true });
export type InsertTalentPool = z.infer<typeof insertTalentPoolSchema>;
export type TalentPoolRow = typeof talentPoolTable.$inferSelect;

export const competitionLogTable = pgTable("competition_log", {
  id: serial("id").primaryKey(),
  competitionId: text("competition_id").notNull().unique(),
  departmentId: text("department_id").notNull(),
  positionId: text("position_id").notNull(),
  candidates: jsonb("candidates").$type<string[]>().notNull().default([]),
  winner: text("winner"),
  voteResults: jsonb("vote_results").$type<{ yes: number; no: number; abstain: number }>(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompetitionLogSchema = createInsertSchema(competitionLogTable).omit({ id: true, createdAt: true });
export type InsertCompetitionLog = z.infer<typeof insertCompetitionLogSchema>;
export type CompetitionLogRow = typeof competitionLogTable.$inferSelect;
