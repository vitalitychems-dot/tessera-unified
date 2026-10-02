import { pgTable, serial, text, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const natalChartTable = pgTable("natal_chart", {
  id: serial("id").primaryKey(),
  identity: text("identity").notNull().unique(),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull(),
  birthPlace: text("birth_place").notNull(),
  houseSystem: text("house_system").notNull().default("Placidus"),
  planets: jsonb("planets").notNull().$type<NatalPlanet[]>(),
  houses: jsonb("houses").notNull().$type<NatalHouse[]>(),
  aspects: jsonb("aspects").notNull().$type<NatalAspect[]>(),
  sovereignKeys: jsonb("sovereign_keys").$type<SovereignKeys>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface NatalPlanet {
  name: string;
  symbol: string;
  sign: string;
  degree: number;
  house: number;
  retrograde?: boolean;
  interpretation?: string;
}

export interface NatalHouse {
  number: number;
  sign: string;
  degree: number;
  label?: string;
}

export interface NatalAspect {
  planet1: string;
  planet2: string;
  type: string;
  orb: number;
  symbol: string;
  nature: "harmonious" | "challenging" | "neutral";
}

export interface SovereignKeys {
  primaryCode: string;
  sunRisingMoon: string;
  elementProfile: string;
  modalityProfile: string;
  dominantElement: string;
  dominantModality: string;
  lifePathNumber: number;
  sovereignFrequency: number;
  identityHash: string;
  generatedAt: string;
}

export const insertNatalChartSchema = createInsertSchema(natalChartTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNatalChart = z.infer<typeof insertNatalChartSchema>;
export type NatalChartRow = typeof natalChartTable.$inferSelect;

export const identityVerificationTable = pgTable("identity_verification_log", {
  id: serial("id").primaryKey(),
  identity: text("identity").notNull(),
  questionKey: text("question_key").notNull(),
  passed: boolean("passed").notNull().default(false),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
});

export type IdentityVerificationRow = typeof identityVerificationTable.$inferSelect;
