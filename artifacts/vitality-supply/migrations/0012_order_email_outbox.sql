-- Durable outbox for customer order emails. One row per (order, kind); a row is
-- claimed before sending so concurrent workers cannot double-send, and queued rows
-- survive an unverified sender domain or a Resend outage until the next flush.
create table if not exists store_order_emails (
  id bigserial primary key,
  order_id text not null references store_orders(id),
  kind text not null,
  status text not null default 'queued',
  attempts int not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind)
);
create index if not exists store_order_emails_pending_idx on store_order_emails (created_at) where sent_at is null;
