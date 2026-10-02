import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const councilSessionsTable = pgTable("council_sessions", {
  id: text("id").primaryKey(),
  seed: text("seed").notNull(),
  convenedAt: timestamp("convened_at", { withTimezone: false }).notNull(),
  adopted: integer("adopted").notNull().default(0),
  meetsQuorum: boolean("meets_quorum").notNull().default(false),
  session: jsonb("session").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CouncilSessionRow = typeof councilSessionsTable.$inferSelect;
