-- Forum identity schema migration
-- Adds: forum_topics, forum_replies, forum_trusted_identities
-- Also adds conversations/messages tables added between migration 0001 and now
-- Uses IF NOT EXISTS throughout to be safe on environments already at any state

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text DEFAULT 'New Chat' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" text DEFAULT 'user' NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_topics" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "author" text DEFAULT '' NOT NULL,
  "author_type" text DEFAULT 'human' NOT NULL,
  "author_key_hash" text,
  "category" text DEFAULT 'general' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "replies" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN IF NOT EXISTS "author_type" text DEFAULT 'human' NOT NULL;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN IF NOT EXISTS "author_key_hash" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_replies" (
  "id" serial PRIMARY KEY NOT NULL,
  "topic_id" integer NOT NULL,
  "content" text NOT NULL,
  "author" text NOT NULL,
  "author_type" text DEFAULT 'human' NOT NULL,
  "author_key_hash" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_principal_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL,
  "principal_name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "forum_principal_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forum_trusted_identities" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "identity_type" text NOT NULL,
  "can_post_from_client" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "forum_trusted_identities_name_unique" UNIQUE("name")
);
