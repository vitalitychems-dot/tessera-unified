-- Reliability metadata for delivery workers. Claims are leases rather than
-- permanent states, so a process killed while sending cannot strand a row.
alter table store_order_emails
  add column if not exists lease_expires_at timestamptz,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz;

create index if not exists store_order_emails_ready_idx
  on store_order_emails (next_attempt_at, created_at)
  where sent_at is null;

-- Welcome delivery uses the same claim/lease shape. `welcome_sent_at` is only
-- written after the provider accepts the message, so a provider failure can
-- safely release the claim for a later retry.
alter table store_subscribers
  add column if not exists welcome_claimed_at timestamptz,
  add column if not exists welcome_lease_expires_at timestamptz,
  add column if not exists welcome_next_attempt_at timestamptz,
  add column if not exists welcome_attempts integer not null default 0,
  add column if not exists welcome_last_error text;

create index if not exists store_subscribers_welcome_ready_idx
  on store_subscribers (welcome_next_attempt_at, created_at)
  where welcome_sent_at is null and unsubscribed_at is null and confirmed_at is not null;