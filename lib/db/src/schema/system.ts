import { pgTable, serial, text, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemLogsTable = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(),
  category: text("category").notNull().default("system"),
  message: text("message").notNull(),
  source: text("source").notNull().default("api-server"),
  context: jsonb("context"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemLogSchema = createInsertSchema(systemLogsTable).omit({ id: true, createdAt: true });
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLogRow = typeof systemLogsTable.$inferSelect;

export const integrityChecksTable = pgTable("integrity_checks", {
  id: serial("id").primaryKey(),
  filePath: text("file_path").notNull(),
  checksum: text("checksum").notNull(),
  status: text("status").notNull().default("unverified"),
  previousChecksum: text("previous_checksum"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

export const insertIntegrityCheckSchema = createInsertSchema(integrityChecksTable).omit({ id: true, checkedAt: true });
export type InsertIntegrityCheck = z.infer<typeof insertIntegrityCheckSchema>;
export type IntegrityCheckRow = typeof integrityChecksTable.$inferSelect;

export const anomalyEventsTable = pgTable("anomaly_events", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  metrics: jsonb("metrics").notNull().default({}),
  resolved: boolean("resolved").notNull().default(false),
  autoRemediated: boolean("auto_remediated").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const insertAnomalyEventSchema = createInsertSchema(anomalyEventsTable).omit({ id: true, detectedAt: true });
export type InsertAnomalyEvent = z.infer<typeof insertAnomalyEventSchema>;
export type AnomalyEventRow = typeof anomalyEventsTable.$inferSelect;

export const realityAuditSnapshotsTable = pgTable("reality_audit_snapshots", {
  id: serial("id").primaryKey(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  totalFindings: integer("total_findings").notNull().default(0),
  converted: integer("converted").notNull().default(0),
  realBacked: integer("real_backed").notNull().default(0),
  stillSimulated: integer("still_simulated").notNull().default(0),
  verifyMismatches: integer("verify_mismatches").notNull().default(0),
  totalSimulationPoints: integer("total_simulation_points").notNull().default(0),
  filesWithSimulations: integer("files_with_simulations").notNull().default(0),
  conversionRate: text("conversion_rate").notNull().default("0"),
  snapshotHash: text("snapshot_hash").notNull(),
  jsonPath: text("json_path").notNull().default(""),
  trigger: text("trigger").notNull().default("manual"),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRealityAuditSnapshotSchema = createInsertSchema(realityAuditSnapshotsTable).omit({ id: true, createdAt: true, scannedAt: true });
export type InsertRealityAuditSnapshot = z.infer<typeof insertRealityAuditSnapshotSchema>;
export type RealityAuditSnapshotRow = typeof realityAuditSnapshotsTable.$inferSelect;
