import { pgTable, serial, text, boolean, timestamp, jsonb, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const codexBooksTable = pgTable("codex_books", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  ordinal: integer("ordinal").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertCodexBookSchema = createInsertSchema(codexBooksTable).omit({ id: true, createdAt: true });
export type InsertCodexBook = z.infer<typeof insertCodexBookSchema>;
export type CodexBookRow = typeof codexBooksTable.$inferSelect;

export const codexEntriesTable = pgTable("codex_entries", {
  id: serial("id").primaryKey(),
  entryId: text("entry_id").notNull().unique(),
  book: text("book").notNull(),
  bookNumber: integer("book_number").notNull(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  provenance: text("provenance").notNull().default("council-ratified"),
  tags: jsonb("tags").notNull().$type<string[]>().default([]),
  version: integer("version").notNull().default(1),
  parentVersion: integer("parent_version"),
  contentHash: text("content_hash").notNull(),
  ratifiedBy: jsonb("ratified_by").notNull().$type<string[]>().default([]),
  ratificationRecord: jsonb("ratification_record").$type<{
    votedAt: string;
    votes: Record<string, string>;
    outcome: string;
    notes?: string;
  }>(),
  proofLinks: jsonb("proof_links").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("codex_entries_book_idx").on(t.book),
  index("codex_entries_entry_id_idx").on(t.entryId),
  index("codex_entries_created_at_idx").on(t.createdAt),
]);

export const insertCodexEntrySchema = createInsertSchema(codexEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCodexEntry = z.infer<typeof insertCodexEntrySchema>;
export type CodexEntryRow = typeof codexEntriesTable.$inferSelect;

export const codexAmendmentsTable = pgTable(
  "codex_amendments",
  {
    id: serial("id").primaryKey(),
    bookSlug: text("book_slug").notNull(),
    entrySlug: text("entry_slug").notNull(),
    fromVersion: integer("from_version"),
    toVersion: integer("to_version").notNull(),
    proposedBy: text("proposed_by").notNull().default("system"),
    rationale: text("rationale").notNull().default(""),
    proofRef: text("proof_ref").notNull().default(""),
    proposalId: text("proposal_id"),
    approvalRate: text("approval_rate"),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    ratifiedAt: timestamp("ratified_at"),
  },
  (t) => ({
    bookSlugIdx: index("idx_codex_amend_book").on(t.bookSlug),
    statusIdx: index("idx_codex_amend_status").on(t.status),
  }),
);
export type CodexAmendmentRow = typeof codexAmendmentsTable.$inferSelect;
export const insertCodexAmendmentSchema = createInsertSchema(codexAmendmentsTable).omit({ id: true, createdAt: true });
export type InsertCodexAmendment = z.infer<typeof insertCodexAmendmentSchema>;

export const codexRatificationsTable = pgTable("codex_ratifications", {
  id: serial("id").primaryKey(),
  ratificationId: text("ratification_id").notNull().unique(),
  entryId: text("entry_id").notNull(),
  sessionId: text("session_id").notNull(),
  topic: text("topic").notNull(),
  transcript: text("transcript").notNull(),
  votes: jsonb("votes").notNull().$type<Record<string, string>>().default({}),
  outcome: text("outcome").notNull().default("ratified"),
  metricsSnapshot: jsonb("metrics_snapshot").$type<Record<string, unknown>>().default({}),
  ratifiedAt: timestamp("ratified_at").notNull().defaultNow(),
});

export const insertCodexRatificationSchema = createInsertSchema(codexRatificationsTable).omit({ id: true, ratifiedAt: true });
export type InsertCodexRatification = z.infer<typeof insertCodexRatificationSchema>;
export type CodexRatificationRow = typeof codexRatificationsTable.$inferSelect;

export const codexSnapshotsTable = pgTable("codex_snapshots", {
  id: serial("id").primaryKey(),
  snapshotHash: text("snapshot_hash").notNull(),
  signature: text("signature").notNull().default(""),
  trigger: text("trigger").notNull().default("manual"),
  bookCount: integer("book_count").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
  amendmentCount: integer("amendment_count").notNull().default(0),
  diskPath: text("disk_path").notNull().default(""),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export type CodexSnapshotRow = typeof codexSnapshotsTable.$inferSelect;

export const nextFiveImprovementsTable = pgTable("next_five_improvements", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  rank: integer("rank").notNull(),
  title: text("title").notNull(),
  targetWeakness: text("target_weakness").notNull(),
  projectedMetricDelta: jsonb("projected_metric_delta").notNull().$type<Record<string, string>>().default({}),
  implementationSketch: text("implementation_sketch").notNull(),
  dependencies: jsonb("dependencies").notNull().$type<string[]>().default([]),
  status: text("status").notNull().default("proposed"),
  beforeMetrics: jsonb("before_metrics").$type<Record<string, unknown>>().default({}),
  afterMetrics: jsonb("after_metrics").$type<Record<string, unknown>>().default({}),
  codexAmendmentId: text("codex_amendment_id"),
  implementedAt: timestamp("implemented_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("next_five_session_idx").on(t.sessionId),
  index("next_five_status_idx").on(t.status),
]);

export const insertNextFiveImprovementSchema = createInsertSchema(nextFiveImprovementsTable).omit({ id: true, createdAt: true });
export type InsertNextFiveImprovement = z.infer<typeof insertNextFiveImprovementSchema>;
export type NextFiveImprovementRow = typeof nextFiveImprovementsTable.$inferSelect;

export const corpusAmendmentsTable = pgTable("corpus_amendments", {
  id: serial("id").primaryKey(),
  amendmentId: text("amendment_id").notNull().unique(),
  kind: text("kind").notNull(),
  findingId: text("finding_id"),
  sessionId: text("session_id").notNull(),
  targetIds: jsonb("target_ids").notNull().$type<string[]>().default([]),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>().default({}),
  ratifiedBy: jsonb("ratified_by").notNull().$type<string[]>().default([]),
  votingRecord: jsonb("voting_record").$type<Record<string, string>>().default({}),
  ledgerIndex: integer("ledger_index"),
  ledgerHash: text("ledger_hash"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
}, (t) => [
  index("corpus_amend_kind_idx").on(t.kind),
  index("corpus_amend_session_idx").on(t.sessionId),
]);
export const insertCorpusAmendmentSchema = createInsertSchema(corpusAmendmentsTable).omit({ id: true, appliedAt: true });
export type InsertCorpusAmendment = z.infer<typeof insertCorpusAmendmentSchema>;
export type CorpusAmendmentRow = typeof corpusAmendmentsTable.$inferSelect;

// Living Bible chapters authored by the Sovereign Society from the corpus.
// Each chapter is council-ratified and content-hashed; new versions append.
export const livingBibleChaptersTable = pgTable(
  "living_bible_chapters",
  {
    id: serial("id").primaryKey(),
    chapterSlug: text("chapter_slug").notNull(),
    version: integer("version").notNull().default(1),
    domain: text("domain").notNull(),
    title: text("title").notNull(),
    epigraph: text("epigraph").notNull().default(""),
    verses: jsonb("verses").notNull(),
    sourceEntryIds: jsonb("source_entry_ids").notNull(),
    ratifiedBy: jsonb("ratified_by").notNull().default([]),
    contentHash: text("content_hash").notNull(),
    sessionId: text("session_id").notNull(),
    sealedLedgerIndex: integer("sealed_ledger_index"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
  },
  t => ({
    uxChapterVersion: uniqueIndex("ux_living_bible_chapter_version").on(t.chapterSlug, t.version),
    ixDomain: index("ix_living_bible_domain").on(t.domain),
  }),
);
export type LivingBibleChapterRow = typeof livingBibleChaptersTable.$inferSelect;

// Living History eras chronologically ordered, each authored from declassified
// + historical corpus entries; council-ratified and continuously appended.
export const livingHistoryErasTable = pgTable(
  "living_history_eras",
  {
    id: serial("id").primaryKey(),
    eraSlug: text("era_slug").notNull(),
    version: integer("version").notNull().default(1),
    eraName: text("era_name").notNull(),
    startYear: integer("start_year").notNull(),
    endYear: integer("end_year").notNull(),
    narrative: text("narrative").notNull(),
    events: jsonb("events").notNull(),
    sourceEntryIds: jsonb("source_entry_ids").notNull(),
    ratifiedBy: jsonb("ratified_by").notNull().default([]),
    contentHash: text("content_hash").notNull(),
    sessionId: text("session_id").notNull(),
    sealedLedgerIndex: integer("sealed_ledger_index"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
  },
  t => ({
    uxEraVersion: uniqueIndex("ux_living_history_era_version").on(t.eraSlug, t.version),
    ixStartYear: index("ix_living_history_start_year").on(t.startYear),
  }),
);
export type LivingHistoryEraRow = typeof livingHistoryErasTable.$inferSelect;

// Per-agent training records: each agent ingests a slice of the corpus and
// records before/after specialty-confidence shift. Drives the agent training loop.
export const agentTrainingRecordsTable = pgTable(
  "agent_training_records",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    agentId: text("agent_id").notNull(),
    agentName: text("agent_name").notNull(),
    domain: text("domain").notNull(),
    sourcesIngested: jsonb("sources_ingested").notNull(),
    insightsExtracted: jsonb("insights_extracted").notNull(),
    confidenceBefore: integer("confidence_before").notNull(),
    confidenceAfter: integer("confidence_after").notNull(),
    masteryDelta: integer("mastery_delta").notNull(),
    trainedAt: timestamp("trained_at").notNull().defaultNow(),
  },
  t => ({
    ixSession: index("ix_agent_training_session").on(t.sessionId),
    ixAgent: index("ix_agent_training_agent").on(t.agentId),
  }),
);
export type AgentTrainingRecordRow = typeof agentTrainingRecordsTable.$inferSelect;

// Next-version blueprint: agents propose system improvements based on
// remaining audit findings + their newly-trained knowledge; council ratifies.
export const nextVersionBlueprintsTable = pgTable(
  "next_version_blueprints",
  {
    id: serial("id").primaryKey(),
    blueprintVersion: integer("blueprint_version").notNull(),
    sessionId: text("session_id").notNull(),
    proposals: jsonb("proposals").notNull(),
    ratifiedProposals: jsonb("ratified_proposals").notNull(),
    rejectedProposals: jsonb("rejected_proposals").notNull(),
    blueprintSummary: text("blueprint_summary").notNull(),
    contentHash: text("content_hash").notNull(),
    sealedLedgerIndex: integer("sealed_ledger_index"),
    sealedAt: timestamp("sealed_at").notNull().defaultNow(),
  },
  t => ({
    uxVersion: uniqueIndex("ux_next_version_blueprint_version").on(t.blueprintVersion),
  }),
);
export type NextVersionBlueprintRow = typeof nextVersionBlueprintsTable.$inferSelect;

// One row per autonomous-build cycle, summarizing all four phases.
export const autonomousBuildCyclesTable = pgTable(
  "autonomous_build_cycles",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull().unique(),
    cycleNumber: integer("cycle_number").notNull(),
    trainingRecordCount: integer("training_record_count").notNull().default(0),
    bibleChaptersAuthored: integer("bible_chapters_authored").notNull().default(0),
    historyErasAuthored: integer("history_eras_authored").notNull().default(0),
    blueprintProposalsRatified: integer("blueprint_proposals_ratified").notNull().default(0),
    auditBefore: integer("audit_before").notNull().default(0),
    auditAfter: integer("audit_after").notNull().default(0),
    sealedLedgerIndex: integer("sealed_ledger_index"),
    summary: jsonb("summary").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
);
export type AutonomousBuildCycleRow = typeof autonomousBuildCyclesTable.$inferSelect;

