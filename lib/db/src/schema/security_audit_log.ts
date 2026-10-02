import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  targetUrl: text("target_url").notNull(),
  method: text("method").notNull(),
  status: integer("status"),
  durationMs: integer("duration_ms"),
  flagged: boolean("flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  requestedBy: text("requested_by"),
});

export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLog).omit({ id: true });
export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
