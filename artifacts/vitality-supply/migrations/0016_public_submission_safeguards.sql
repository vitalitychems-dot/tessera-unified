-- Durable abuse controls for unauthenticated submissions.  Counters live in
-- Postgres so several app instances cannot each grant their own budget.
-- Public opt-in state is durable so a resubscribe cannot replay a welcome
-- message.
alter table store_subscribers add column if not exists confirmation_token text;
alter table store_subscribers add column if not exists confirmation_sent_at timestamptz;
alter table store_subscribers add column if not exists confirmed_at timestamptz;

update store_subscribers
set confirmed_at = coalesce(confirmed_at, created_at),
    confirmation_token = coalesce(
      confirmation_token,
      md5(random()::text || clock_timestamp()::text || id::text)
    )
where confirmed_at is null or confirmation_token is null;

create unique index if not exists store_subscribers_confirmation_token_uidx
  on store_subscribers (confirmation_token);

create table if not exists wholesale_lead_keys (
  email_key          text primary key,
  last_submitted_at  timestamptz not null default now(),
  window_started_at  timestamptz not null default now(),
  submission_count   integer not null default 0,
  constraint wholesale_lead_keys_count_ck check (submission_count between 0 and 3)
);

create index if not exists wholesale_lead_keys_cooldown_idx
  on wholesale_lead_keys (last_submitted_at);

create table if not exists newsletter_request_limits (
  email_key          text primary key,
  last_requested_at  timestamptz not null default now()
);

create index if not exists newsletter_request_limits_requested_idx
  on newsletter_request_limits(last_requested_at);

create table if not exists public_event_limits (
  session_id       text primary key,
  window_started_at timestamptz not null default now(),
  event_count      integer not null default 0,
  last_event_at    timestamptz not null default now(),
  constraint public_event_limits_count_ck check (event_count between 0 and 240)
);

create index if not exists public_event_limits_last_event_idx
  on public_event_limits(last_event_at);