-- The manager may observe immediately, but autonomous self-improvement waits
-- for four weeks of server-classified live analytics with a meaningful sample.
create table if not exists manager_observation_gate (
  -- The application only reads and writes id=true. Do not add CHECK (id):
  -- Replit's publish schema serializer can emit that boolean shorthand as
  -- the invalid nested expression CHECK (CHECK (id)).
  id boolean primary key default true,
  started_at timestamptz,
  eligible_at timestamptz,
  status text not null default 'awaiting_live_data'
    check (status in ('awaiting_live_data', 'observing', 'eligible')),
  live_events bigint not null default 0,
  live_sessions bigint not null default 0,
  live_days integer not null default 0,
  last_checked_at timestamptz,
  blocked_reason text,
  updated_at timestamptz not null default now()
);

insert into manager_observation_gate (id, status, blocked_reason)
values (true, 'awaiting_live_data', 'Waiting for the first server-classified live analytics event.')
on conflict (id) do nothing;

alter table manager_audit_runs
  add column if not exists observation_status text
    check (observation_status in ('awaiting_live_data', 'observing', 'eligible')),
  add column if not exists actions_skipped_reason text,
  add column if not exists proposed_actions jsonb not null default '[]'::jsonb;

insert into manager_settings (key, value)
values
  ('newsletter_content_backlog', '[]'::jsonb),
  ('community_content_backlog', '[]'::jsonb),
  ('outreach_opportunity_backlog', '[]'::jsonb)
on conflict (key) do nothing;