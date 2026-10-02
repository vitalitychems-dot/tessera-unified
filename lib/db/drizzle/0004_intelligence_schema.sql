-- Intelligence layer schema migration
-- Adds: semantic_cache, distilled_knowledge, self_evaluation_history
-- Uses IF NOT EXISTS throughout to be safe on environments already at any state

CREATE TABLE IF NOT EXISTS "semantic_cache" (
  "id" serial PRIMARY KEY NOT NULL,
  "prompt_hash" text NOT NULL UNIQUE,
  "prompt_text" text NOT NULL,
  "embedding" jsonb DEFAULT '[]'::jsonb,
  "response" text NOT NULL,
  "model" text DEFAULT 'gpt-5-mini' NOT NULL,
  "hit_count" integer DEFAULT 0 NOT NULL,
  "ttl_seconds" integer DEFAULT 3600 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "last_hit_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_semantic_cache_expires" ON "semantic_cache" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distilled_knowledge" (
  "id" serial PRIMARY KEY NOT NULL,
  "fact" text NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "source" text DEFAULT 'llm' NOT NULL,
  "source_prompt" text,
  "confidence" real DEFAULT 0.8 NOT NULL,
  "access_count" integer DEFAULT 0 NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "last_verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distilled_knowledge_confidence" ON "distilled_knowledge" ("confidence");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_distilled_knowledge_category" ON "distilled_knowledge" ("category");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "self_evaluation_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "cycle_number" integer NOT NULL,
  "overall_score" real NOT NULL,
  "cache_hit_rate" real DEFAULT 0 NOT NULL,
  "knowledge_hit_rate" real DEFAULT 0 NOT NULL,
  "embedding_quality" real DEFAULT 0 NOT NULL,
  "llm_calls_reduced" integer DEFAULT 0 NOT NULL,
  "source_scores" jsonb DEFAULT '{}'::jsonb,
  "adjustments" jsonb DEFAULT '{}'::jsonb,
  "weak_areas" jsonb DEFAULT '[]'::jsonb,
  "strong_areas" jsonb DEFAULT '[]'::jsonb,
  "evaluated_at" timestamp DEFAULT now() NOT NULL
);
