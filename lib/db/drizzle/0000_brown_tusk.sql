CREATE TABLE "anomaly_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"auto_remediated" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"detected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrity_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"checksum" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"previous_checksum" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"category" text DEFAULT 'system' NOT NULL,
	"message" text NOT NULL,
	"source" text DEFAULT 'api-server' NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
