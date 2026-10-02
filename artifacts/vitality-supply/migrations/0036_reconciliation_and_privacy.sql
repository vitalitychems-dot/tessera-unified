-- Production reconciliation, payment adjustments, worker heartbeats, and
-- privacy-safe staff access. All changes are additive and reversible.
alter table store_orders
  add column if not exists stripe_invoice_id text,
  add column if not exists payment_hold boolean not null default false,
  add column if not exists refund_total numeric not null default 0,
  add column if not exists dispute_status text,
  add column if not exists access_key_expires_at timestamptz,
  add column if not exists access_key_revoked_at timestamptz;

update store_orders
set access_key_expires_at = coalesce(access_key_expires_at, created_at + interval '365 days')
where access_key_expires_at is null;

create unique index if not exists store_orders_stripe_invoice_uniq
  on store_orders (stripe_invoice_id) where stripe_invoice_id is not null;

create unique index if not exists store_orders_subscription_cycle_uniq
  on store_orders (subscription_id, subscription_cycle)
  where subscription_id is not null and subscription_cycle is not null;

alter table store_subscriptions
  add column if not exists stripe_status_at timestamptz;

create table if not exists stripe_event_ledger (
  id text primary key,
  type text not null,
  object_id text,
  stripe_created_at timestamptz,
  livemode boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'processed', 'retry', 'dead')),
  attempts integer not null default 0,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_event_ledger_ready_idx
  on stripe_event_ledger (next_attempt_at, created_at)
  where status in ('queued', 'retry');

create index if not exists stripe_event_ledger_status_idx
  on stripe_event_ledger (status, updated_at desc);

create table if not exists payment_adjustments (
  id bigserial primary key,
  event_id text not null references stripe_event_ledger(id),
  object_id text not null,
  order_id text references store_orders(id),
  kind text not null check (kind in ('refund', 'dispute')),
  amount numeric not null default 0,
  currency text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique (event_id),
  unique (kind, object_id)
);

create index if not exists payment_adjustments_order_idx
  on payment_adjustments (order_id, created_at desc);

create table if not exists worker_heartbeats (
  worker text primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error text,
  processed_count integer not null default 0
);

create table if not exists staff_access_audit (
  id bigserial primary key,
  actor_user_id text not null,
  action text not null,
  subject_id text,
  created_at timestamptz not null default now()
);

create index if not exists staff_access_audit_created_idx
  on staff_access_audit (created_at desc);