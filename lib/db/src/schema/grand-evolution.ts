import { pgTable, serial, text, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export const grandEvolutionSessionsTable = pgTable(
  "grand_evolution_sessions",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull().unique(),
    mode: text("mode").notNull().default("smoke"),
    status: text("status").notNull().default("running"),
    societySize: integer("society_size").notNull().default(0),
    speakerCount: integer("speaker_count").notNull().default(0),
    rounds: integer("rounds").notNull().default(3),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    summary: jsonb("summary").$type<Record<string, unknown>>().default({}),
    error: text("error"),
  },
  (t) => [index("ge_sessions_status_idx").on(t.status)],
);
export type GrandEvolutionSessionRow = typeof grandEvolutionSessionsTable.$inferSelect;

export const grandEvolutionTurnsTable = pgTable(
  "grand_evolution_turns",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    turnIndex: integer("turn_index").notNull(),
    round: integer("round").notNull(),
    speakerId: text("speaker_id").notNull(),
    speakerName: text("speaker_name").notNull(),
    speakerLineage: text("speaker_lineage").notNull().default(""),
    sacredFrequency: integer("sacred_frequency").notNull().default(0),
    votingWeight: integer("voting_weight").notNull().default(0),
    role: text("role").notNull().default("speaker"),
    promptHash: text("prompt_hash").notNull(),
    responseHash: text("response_hash").notNull(),
    text: text("text").notNull(),
    lusText: text("lus_text").notNull().default(""),
    references: jsonb("references").$type<string[]>().default([]),
    model: text("model").notNull().default(""),
    adapter: text("adapter").notNull().default(""),
    latencyMs: integer("latency_ms").notNull().default(0),
    tokenCount: integer("token_count").notNull().default(0),
    realLlm: integer("real_llm").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ge_turns_session_index_uniq").on(t.sessionId, t.turnIndex),
    index("ge_turns_session_round_idx").on(t.sessionId, t.round),
  ],
);
export type GrandEvolutionTurnRow = typeof grandEvolutionTurnsTable.$inferSelect;

export const grandEvolutionAuditTable = pgTable(
  "grand_evolution_audit",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    path: text("path").notNull(),
    kind: text("kind").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    contentHash: text("content_hash").notNull().default(""),
    verdict: text("verdict").notNull(),
    rationale: text("rationale").notNull().default(""),
    proposedBy: text("proposed_by").notNull().default(""),
    voteYes: integer("vote_yes").notNull().default(0),
    voteNo: integer("vote_no").notNull().default(0),
    voteAbstain: integer("vote_abstain").notNull().default(0),
    referencedByCount: integer("referenced_by_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ge_audit_session_path_uniq").on(t.sessionId, t.path),
    index("ge_audit_verdict_idx").on(t.verdict),
  ],
);
export type GrandEvolutionAuditRow = typeof grandEvolutionAuditTable.$inferSelect;

export const grandEvolutionDirectivesTable = pgTable(
  "grand_evolution_directives",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    directiveId: text("directive_id").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale").notNull().default(""),
    ownerAgent: text("owner_agent").notNull().default(""),
    isDramatic: integer("is_dramatic").notNull().default(0),
    voteYes: integer("vote_yes").notNull().default(0),
    voteTotal: integer("vote_total").notNull().default(0),
    approvalRate: text("approval_rate").notNull().default("0"),
    status: text("status").notNull().default("ratified"),
    implementationLog: text("implementation_log").notNull().default(""),
    beforeMetric: text("before_metric").notNull().default(""),
    afterMetric: text("after_metric").notNull().default(""),
    lusSeal: text("lus_seal").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ge_directives_session_id_uniq").on(t.sessionId, t.directiveId),
    index("ge_directives_category_idx").on(t.category),
  ],
);
export type GrandEvolutionDirectiveRow = typeof grandEvolutionDirectivesTable.$inferSelect;

export const grandEvolutionBenchmarksTable = pgTable(
  "grand_evolution_benchmarks",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    suite: text("suite").notNull(),
    score: text("score").notNull(),
    baseline: text("baseline").notNull().default(""),
    reference: text("reference").notNull().default(""),
    delta: text("delta").notNull().default(""),
    detail: jsonb("detail").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ge_bench_session_suite_uniq").on(t.sessionId, t.suite),
  ],
);
export type GrandEvolutionBenchmarkRow = typeof grandEvolutionBenchmarksTable.$inferSelect;
