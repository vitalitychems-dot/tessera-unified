-- Autonomous organic-search content engine. Every page is a versioned,
-- compliance-gated document; only versions that passed BOTH the deterministic
-- gate and the model self-audit are ever served. All writes come from the
-- fenced scheduler run or an authenticated admin, never from a page request.
-- The dev migrator runs this file in one transaction; production receives the
-- schema through Publish.

create table if not exists content_pages (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  kind text not null check (kind in ('compound', 'family', 'method')),
  -- Public path without the origin, e.g. /research/semaglutide or
  -- /compounds/receptor-pathway-compounds.
  path text not null unique,
  subject_id text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unpublished', 'failed')),
  current_version_id text,
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_published_at timestamptz,
  published_at timestamptz,
  content_updated_at timestamptz,
  last_verified_at timestamptz,
  next_refresh_at timestamptz,
  unpublish_reason text,
  unique (kind, subject_id)
);
create index if not exists content_pages_status_idx on content_pages (status, kind);

create table if not exists content_versions (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  page_id text not null references content_pages(id) on delete cascade,
  version integer not null,
  title text not null,
  description text not null,
  body jsonb not null,
  gate_status text not null check (gate_status in ('passed', 'failed')),
  gate_report jsonb not null default '{}'::jsonb,
  model text,
  created_by text not null default 'scheduler',
  created_at timestamptz not null default now(),
  unique (page_id, version)
);

create table if not exists content_events (
  id bigserial primary key,
  page_id text references content_pages(id) on delete cascade,
  run_id text,
  event text not null check (event in (
    'generated', 'gate_failed', 'published', 'refreshed', 'unpublished',
    'republished', 'rolled_back', 'paused', 'resumed', 'error')),
  detail jsonb not null default '{}'::jsonb,
  actor text not null default 'scheduler',
  created_at timestamptz not null default now()
);
create index if not exists content_events_created_idx on content_events (created_at desc);
create index if not exists content_events_page_idx on content_events (page_id, created_at desc);

create table if not exists content_indexnow_submissions (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  urls jsonb not null,
  reason text not null,
  outcome text not null check (outcome in ('accepted', 'rejected', 'failed', 'skipped')),
  status_code integer,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists content_indexnow_created_idx
  on content_indexnow_submissions (created_at desc);

create table if not exists content_engine_runs (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  trigger text not null default 'scheduler'
    check (trigger in ('scheduler', 'manual')),
  owner_token text,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  next_due_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists content_one_active_run_idx
  on content_engine_runs ((true)) where status in ('queued', 'running');
create index if not exists content_engine_runs_created_idx
  on content_engine_runs (created_at desc);

-- Single-row engine state: pause switch, auto-pause counter, and daily budgets.
create table if not exists content_engine_state (
  -- The application only reads and writes id=true. Do not add CHECK (id):
  -- Replit's publish schema serializer currently emits that PostgreSQL
  -- boolean shorthand as the invalid nested expression CHECK (CHECK (id)).
  id boolean primary key default true,
  paused boolean not null default false,
  paused_reason text,
  paused_by text,
  consecutive_gate_failures integer not null default 0,
  budget_day date,
  publishes_today integer not null default 0,
  model_calls_today integer not null default 0,
  daily_publish_cap integer not null default 3,
  daily_model_call_cap integer not null default 24,
  updated_at timestamptz not null default now()
);
insert into content_engine_state (id) values (true) on conflict (id) do nothing;
