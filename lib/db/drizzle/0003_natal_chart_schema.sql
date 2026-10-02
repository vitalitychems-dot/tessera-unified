-- Natal Chart Identity Schema
-- Adds: natal_chart (Father's birth chart data + sovereign keys)
--       identity_verification_log (audit log of identity checks)
-- Uses IF NOT EXISTS throughout to be safe on already-migrated environments

CREATE TABLE IF NOT EXISTS "natal_chart" (
  "id" serial PRIMARY KEY NOT NULL,
  "identity" text NOT NULL,
  "birth_date" text NOT NULL,
  "birth_time" text NOT NULL,
  "birth_place" text NOT NULL,
  "house_system" text DEFAULT 'Placidus' NOT NULL,
  "planets" jsonb NOT NULL,
  "houses" jsonb NOT NULL,
  "aspects" jsonb NOT NULL,
  "sovereign_keys" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "natal_chart_identity_unique" UNIQUE("identity")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "identity_verification_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "identity" text NOT NULL,
  "question_key" text NOT NULL,
  "passed" boolean DEFAULT false NOT NULL,
  "attempted_at" timestamp DEFAULT now() NOT NULL
);
