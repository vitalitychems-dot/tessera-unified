-- Durable owner notifications for public partner and investor inquiries.
-- Contact rows are intentionally kept separate from order mail: they do not
-- have an order foreign key, and a provider outage must not lose a lead.
create table if not exists contact_notification_emails (
  id bigserial primary key,
  contact_kind text not null check (contact_kind in ('partner', 'investor')),
  contact_id bigint not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'dead', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_kind, contact_id)
);

create index if not exists contact_notification_emails_ready_idx
  on contact_notification_emails (next_attempt_at, created_at)
  where sent_at is null and status not in ('dead', 'skipped');