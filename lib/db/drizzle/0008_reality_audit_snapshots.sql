CREATE TABLE IF NOT EXISTS "reality_audit_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"total_findings" integer DEFAULT 0 NOT NULL,
	"converted" integer DEFAULT 0 NOT NULL,
	"real_backed" integer DEFAULT 0 NOT NULL,
	"still_simulated" integer DEFAULT 0 NOT NULL,
	"verify_mismatches" integer DEFAULT 0 NOT NULL,
	"total_simulation_points" integer DEFAULT 0 NOT NULL,
	"files_with_simulations" integer DEFAULT 0 NOT NULL,
	"conversion_rate" text DEFAULT '0' NOT NULL,
	"snapshot_hash" text NOT NULL,
	"json_path" text DEFAULT '' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reality_audit_scanned_at" ON "reality_audit_snapshots" ("scanned_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reality_audit_trigger" ON "reality_audit_snapshots" ("trigger");
