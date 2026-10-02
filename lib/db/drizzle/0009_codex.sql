CREATE TABLE IF NOT EXISTS "codex_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "codex_books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"slug" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_version_id" integer,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content_hash" text NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"ratified_by" text,
	"ratified_at" timestamp,
	"ratification_proposal_id" text,
	"ratification_approval_rate" text,
	"disk_path" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_codex_entry_book_slug_version" ON "codex_entries" ("book_id","slug","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_codex_entry_book" ON "codex_entries" ("book_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_codex_entry_status" ON "codex_entries" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex_amendments" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_slug" text NOT NULL,
	"entry_slug" text NOT NULL,
	"from_version" integer,
	"to_version" integer NOT NULL,
	"proposed_by" text DEFAULT 'system' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"proof_ref" text DEFAULT '' NOT NULL,
	"proposal_id" text,
	"approval_rate" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ratified_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_codex_amend_book" ON "codex_amendments" ("book_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_codex_amend_status" ON "codex_amendments" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_hash" text NOT NULL,
	"signature" text DEFAULT '' NOT NULL,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"book_count" integer DEFAULT 0 NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"amendment_count" integer DEFAULT 0 NOT NULL,
	"disk_path" text DEFAULT '' NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
