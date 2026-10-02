-- Durable, PII-minimised AI Store Manager state.  The manager only receives
-- aggregate funnel/order data; conversation and audit content is bounded text.
create table if not exists manager_audit_runs (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  trigger text not null default 'manual'
    check (trigger in ('manual', 'daily', 'scheduler')),
  started_at timestamptz,
  completed_at timestamptz,
  next_due_at timestamptz,
  error text,
  source_domain text not null default 'https://vitalitychem.com',
  created_at timestamptz not null default now()
);
create unique index if not exists manager_one_active_audit_idx
  on manager_audit_runs ((true)) where status in ('queued', 'running');
create index if not exists manager_audit_runs_created_idx
  on manager_audit_runs (created_at desc);

create table if not exists manager_findings (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  run_id text not null references manager_audit_runs(id) on delete cascade,
  category text not null check (category in
    ('performance', 'seo', 'competitors', 'funnel', 'orders', 'accessibility', 'ads')),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  title text not null,
  detail text not null,
  recommendation text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists manager_findings_run_idx on manager_findings(run_id, severity);

create table if not exists manager_actions (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  run_id text references manager_audit_runs(id) on delete set null,
  action_key text not null,
  before_value jsonb,
  after_value jsonb,
  rationale text not null,
  actor text not null,
  applied_at timestamptz not null default now(),
  rolled_back_at timestamptz,
  rollback_value jsonb,
  rollback_actor text
);
create index if not exists manager_actions_applied_idx on manager_actions(applied_at desc);

create table if not exists manager_conversations (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  admin_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists manager_messages (
  id bigserial primary key,
  conversation_id text not null references manager_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists manager_messages_conversation_idx
  on manager_messages(conversation_id, created_at);

create table if not exists manager_competitor_snapshots (
  id text primary key default md5(random()::text || clock_timestamp()::text),
  run_id text references manager_audit_runs(id) on delete set null,
  url text not null,
  status text not null check (status in ('checked', 'failed')),
  title text,
  summary text,
  evidence jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now()
);
create index if not exists manager_competitor_snapshots_checked_idx
  on manager_competitor_snapshots(checked_at desc);

create table if not exists manager_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into manager_settings (key, value)
values ('newsletter_auto_delay_ms', '15000'::jsonb)
on conflict (key) do nothing;
insert into manager_settings (key, value)
values ('competitor_watchlist', '[]'::jsonb),
       ('seo_opportunity_backlog', '[]'::jsonb),
       ('ad_idea_backlog', '[]'::jsonb),
       ('funnel_opportunity_backlog', '[]'::jsonb),
       ('manager_notes', '[]'::jsonb)
on conflict (key) do nothing;