-- Cross-instance request budgets for public write/email endpoints. Request keys
-- are irreversible HMACs, not stored network addresses.
create table if not exists public_action_limits (
  action             text not null,
  request_key        text not null,
  window_started_at  timestamptz not null default now(),
  request_count      integer not null default 0,
  last_request_at    timestamptz not null default now(),
  primary key (action, request_key),
  constraint public_action_limits_global_key_ck check (request_key = '__global__'),
  constraint public_action_limits_count_ck check (request_count between 0 and 10000)
);
create index if not exists public_action_limits_last_request_idx
  on public_action_limits(last_request_at);

create table if not exists coa_request_limits (
  email_key          text primary key,
  last_submitted_at  timestamptz not null default now(),
  window_started_at  timestamptz not null default now(),
  submission_count   integer not null default 0,
  constraint coa_request_limits_count_ck check (submission_count between 0 and 3)
);
create index if not exists coa_request_limits_last_submitted_idx
  on coa_request_limits(last_submitted_at);