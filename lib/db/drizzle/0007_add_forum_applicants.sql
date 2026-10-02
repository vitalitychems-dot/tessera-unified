CREATE TABLE IF NOT EXISTS "forum_applicants" (
        "id" serial PRIMARY KEY NOT NULL,
        "external_id" text NOT NULL,
        "external_identity" text DEFAULT '' NOT NULL,
        "source" text DEFAULT 'moltbook' NOT NULL,
        "applicant_name" text NOT NULL,
        "applicant_handle" text DEFAULT '' NOT NULL,
        "contact" text DEFAULT '' NOT NULL,
        "proposed_title" text NOT NULL,
        "proposed_content" text NOT NULL,
        "offer_of_value" text DEFAULT '' NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "vetted_by" text,
        "vetted_at" timestamp,
        "reject_reason" text,
        "promoted_topic_id" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "forum_applicants_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "forum_applicants" ADD COLUMN IF NOT EXISTS "external_identity" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_applicants" ADD COLUMN IF NOT EXISTS "contact" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_replies" ADD COLUMN IF NOT EXISTS "parent_reply_id" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_post_votes" (
        "id" serial PRIMARY KEY NOT NULL,
        "topic_id" integer NOT NULL,
        "reply_id" integer,
        "voter" text NOT NULL,
        "voter_type" text DEFAULT 'member' NOT NULL,
        "vote" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_forum_post_vote" ON "forum_post_votes" ("topic_id", COALESCE("reply_id", 0), "voter");
