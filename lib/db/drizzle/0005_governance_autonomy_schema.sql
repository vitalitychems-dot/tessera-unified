-- Governance & autonomy layer schema migration
-- Adds: agent_hierarchy, council_config_changes, tuning_decisions
-- Uses IF NOT EXISTS throughout to be safe on environments already at any state

CREATE TABLE IF NOT EXISTS "agent_hierarchy" (
  "id" serial PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "parent_agent" text,
  "tier" text DEFAULT 'council' NOT NULL,
  "shift" text,
  "status" text DEFAULT 'active' NOT NULL,
  "domain" text DEFAULT 'general' NOT NULL,
  "last_active_at" timestamp DEFAULT now(),
  "task_history" jsonb DEFAULT '[]'::jsonb,
  "performance_metrics" jsonb DEFAULT '{"tasksCompleted":0,"successRate":1.0,"avgResponseMs":0,"ethicsScore":95}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "council_config_changes" (
  "id" serial PRIMARY KEY NOT NULL,
  "proposal_id" text NOT NULL,
  "subsystem" text NOT NULL,
  "parameter" text NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_council_config_proposal" ON "council_config_changes" ("proposal_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tuning_decisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "metric" text NOT NULL,
  "parameter" text NOT NULL,
  "old_value" real NOT NULL,
  "new_value" real NOT NULL,
  "reason" text NOT NULL,
  "cycle_number" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tuning_decisions_cycle" ON "tuning_decisions" ("cycle_number");
