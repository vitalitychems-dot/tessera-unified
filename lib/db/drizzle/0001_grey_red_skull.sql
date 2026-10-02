CREATE TABLE "security_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"target_url" text NOT NULL,
	"method" text NOT NULL,
	"status" integer,
	"duration_ms" integer,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"requested_by" text
);
--> statement-breakpoint
CREATE TABLE "benchmark_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_type" text DEFAULT 'category' NOT NULL,
	"overall_score" integer,
	"grade" text,
	"percentile" integer,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"external_calls" integer DEFAULT 0 NOT NULL,
	"internal_calls" integer DEFAULT 0 NOT NULL,
	"active_providers" integer DEFAULT 0 NOT NULL,
	"heap_used_mb" integer,
	"heap_total_mb" integer,
	"uptime_seconds" integer,
	"category_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dimension_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verdict" text,
	"ran_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"model" text NOT NULL,
	"request_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_text" text,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"error" text,
	"status" text DEFAULT 'success' NOT NULL,
	"is_external" boolean DEFAULT true NOT NULL,
	"is_dry_run" boolean DEFAULT false NOT NULL,
	"called_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_diffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"providers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"similarity_matrix" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"winner_provider_id" text,
	"scoring_criteria" text,
	"diffed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"is_external" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"success_calls" integer DEFAULT 0 NOT NULL,
	"error_calls" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" real,
	"p95_latency_ms" real,
	"error_rate" real DEFAULT 0 NOT NULL,
	"avg_input_tokens" real,
	"avg_output_tokens" real,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capability_score" real DEFAULT 0 NOT NULL,
	"reliability_score" real DEFAULT 0 NOT NULL,
	"speed_score" real DEFAULT 0 NOT NULL,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "provider_profiles_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "sovereignty_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"external_calls" integer DEFAULT 0 NOT NULL,
	"internal_calls" integer DEFAULT 0 NOT NULL,
	"internal_ratio" real DEFAULT 0 NOT NULL,
	"sovereignty_score" real DEFAULT 0 NOT NULL,
	"detachment_readiness" real DEFAULT 0 NOT NULL,
	"performance_parity_score" real DEFAULT 0 NOT NULL,
	"avg_external_latency_ms" real,
	"avg_internal_latency_ms" real,
	"active_providers" integer DEFAULT 0 NOT NULL,
	"external_providers" integer DEFAULT 0 NOT NULL,
	"internal_providers" integer DEFAULT 0 NOT NULL,
	"dry_run_simulated" boolean DEFAULT false NOT NULL,
	"dry_run_success_rate" real,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"rationale" text NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb,
	"outcome" text,
	"significance" text DEFAULT 'low' NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"session_id" text,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"last_saved_at" timestamp DEFAULT now() NOT NULL,
	"restored_at" timestamp,
	CONSTRAINT "system_state_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "vector_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "causal_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"counterfactuals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer,
	"description" text NOT NULL,
	"language" text DEFAULT 'typescript' NOT NULL,
	"code" text NOT NULL,
	"tests" text,
	"execution_result" jsonb,
	"model" text DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reasoning_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"sub_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reasoning_traces" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer,
	"title" text NOT NULL,
	"query" text NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conclusion" text,
	"model" text DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "swarm_reasoning_traces" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"domain" text NOT NULL,
	"phase" text NOT NULL,
	"content" text NOT NULL,
	"quality" real,
	"self_assessment_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swarm_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"task" text NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"selected_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_report" jsonb DEFAULT 'null'::jsonb,
	"final_answer" text,
	"agent_count" integer DEFAULT 0 NOT NULL,
	"overall_quality" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "swarm_tasks_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"interval_seconds" integer DEFAULT 3600 NOT NULL,
	"last_run_at" timestamp,
	"last_success_at" timestamp,
	"last_error" text,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"total_ingested" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ingested_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_type" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"url" text,
	"content_hash" text NOT NULL,
	"embedding_id" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"published_at" timestamp,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingested_data_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"source_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"items_ingested" integer DEFAULT 0 NOT NULL,
	"items_skipped" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "council_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"topic" text NOT NULL,
	"transcript" text DEFAULT '' NOT NULL,
	"decision_text" text DEFAULT '' NOT NULL,
	"vote_tally" jsonb DEFAULT '{"yes":0,"no":0,"abstain":0,"totalEligible":45}'::jsonb NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"agents_participated" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "council_decisions_decision_id_unique" UNIQUE("decision_id")
);
--> statement-breakpoint
CREATE TABLE "inventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"invention_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'technology' NOT NULL,
	"difficulty" text DEFAULT 'Intermediate' NOT NULL,
	"cost_estimate" text DEFAULT 'Unknown' NOT NULL,
	"time_estimate" text DEFAULT 'Unknown' NOT NULL,
	"description" text NOT NULL,
	"how_it_helps" text DEFAULT '' NOT NULL,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"science_behind" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"votes" jsonb DEFAULT '{"yes":0,"no":0,"abstain":0}'::jsonb NOT NULL,
	"proposed_by" text DEFAULT 'council' NOT NULL,
	"feasibility_score" real DEFAULT 50 NOT NULL,
	"novelty_score" real DEFAULT 50 NOT NULL,
	"build_progress" real DEFAULT 0 NOT NULL,
	"impact" text DEFAULT '' NOT NULL,
	"blueprint" text,
	"supporters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conference_round" integer DEFAULT 1 NOT NULL,
	"proposed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventions_invention_id_unique" UNIQUE("invention_id")
);
--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benchmark_runs_ran_at_idx" ON "benchmark_runs" USING btree ("ran_at");--> statement-breakpoint
CREATE INDEX "benchmark_runs_run_type_idx" ON "benchmark_runs" USING btree ("run_type");--> statement-breakpoint
CREATE INDEX "provider_calls_provider_id_idx" ON "provider_calls" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "provider_calls_called_at_idx" ON "provider_calls" USING btree ("called_at");--> statement-breakpoint
CREATE INDEX "provider_diffs_diffed_at_idx" ON "provider_diffs" USING btree ("diffed_at");--> statement-breakpoint
CREATE INDEX "provider_profiles_provider_id_idx" ON "provider_profiles" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "sovereignty_metrics_computed_at_idx" ON "sovereignty_metrics" USING btree ("computed_at");--> statement-breakpoint
CREATE INDEX "ingested_data_source_idx" ON "ingested_data" USING btree ("source");--> statement-breakpoint
CREATE INDEX "ingested_data_source_type_idx" ON "ingested_data" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "ingested_data_ingested_at_idx" ON "ingested_data" USING btree ("ingested_at");--> statement-breakpoint
CREATE INDEX "council_decisions_created_at_idx" ON "council_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "council_decisions_outcome_idx" ON "council_decisions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "inventions_category_idx" ON "inventions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventions_status_idx" ON "inventions" USING btree ("status");