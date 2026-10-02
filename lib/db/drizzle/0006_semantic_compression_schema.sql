-- Semantic Compression Pipeline schema migration
-- Adds: knowledge_canonical, compression_runs
-- Uses IF NOT EXISTS throughout to be safe on environments already at any state

CREATE TABLE IF NOT EXISTS "knowledge_canonical" (
  "id" serial PRIMARY KEY NOT NULL,
  "canonical_fact" text NOT NULL,
  "encoded_fact" text,
  "encoded_dict_run_id" text,
  "embedding" jsonb DEFAULT '[]'::jsonb,
  "domains" jsonb DEFAULT '[]'::jsonb,
  "source_ids" jsonb DEFAULT '[]'::jsonb,
  "confidence" real DEFAULT 0.8 NOT NULL,
  "compression_ratio" real DEFAULT 1.0 NOT NULL,
  "access_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "compression_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL UNIQUE,
  "total_input_facts" integer DEFAULT 0 NOT NULL,
  "total_canonical_facts" integer DEFAULT 0 NOT NULL,
  "duplicates_removed" integer DEFAULT 0 NOT NULL,
  "original_bytes" integer DEFAULT 0 NOT NULL,
  "compressed_bytes" integer DEFAULT 0 NOT NULL,
  "compression_ratio" real DEFAULT 1.0 NOT NULL,
  "avg_retrieval_ms" real DEFAULT 0 NOT NULL,
  "portal_jump_entries" integer DEFAULT 0 NOT NULL,
  "dictionary_size" integer DEFAULT 0 NOT NULL,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "dictionary_data" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add dictionary_data if table already exists (idempotent)
ALTER TABLE "compression_runs" ADD COLUMN IF NOT EXISTS "dictionary_data" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint

-- Add encoded_dict_run_id if table already exists (idempotent)
ALTER TABLE "knowledge_canonical" ADD COLUMN IF NOT EXISTS "encoded_dict_run_id" text;
--> statement-breakpoint

-- Add canonical_id pointer to distilled_knowledge for single-storage semantics.
-- Set by the compression pipeline after each canonical upsert so that all source rows
-- in a dedup group reference a single canonical entry. Used by lookupKnowledge to
-- deduplicate results in the read path. (idempotent)
ALTER TABLE "distilled_knowledge" ADD COLUMN IF NOT EXISTS "canonical_id" integer;
--> statement-breakpoint

-- Make fact nullable: after a compression run assigns a canonicalId, the pipeline
-- nullifies fact on the distilled row. The canonical store (knowledge_canonical)
-- is then the single authoritative text source for that fact. (idempotent)
ALTER TABLE "distilled_knowledge" ALTER COLUMN "fact" DROP NOT NULL;
