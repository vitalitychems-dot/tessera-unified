-- Tighten invariants used by public order links and add indexes for worker recovery.
-- This is additive after the existing backfill in 0036/0037.
alter table store_orders
  alter column access_key_expires_at set not null;

alter table store_subscriptions
  add column if not exists client_idempotency_key text;

create unique index if not exists store_subscriptions_client_idempotency_uidx
  on store_subscriptions (client_idempotency_key)
  where client_idempotency_key is not null;

create index if not exists store_orders_access_key_expiry_idx
  on store_orders (access_key_expires_at)
  where access_key_revoked_at is null;

create index if not exists stripe_event_ledger_reclaim_idx
  on stripe_event_ledger (lease_expires_at, created_at)
  where status = 'processing';

create index if not exists newsletter_deliveries_ready_idx
  on newsletter_deliveries (next_attempt_at, created_at)
  where sent_at is null and status <> 'skipped';