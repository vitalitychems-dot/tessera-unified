-- Commerce automation, tax snapshots, recurring billing, and human-reviewed
-- outbound content. All money-bearing values are copied onto the order so later
-- catalog/settings edits cannot rewrite historical supplier or profit notices.
alter table store_orders
  add column if not exists sales_tax numeric not null default 0,
  add column if not exists tax_rate numeric not null default 0,
  add column if not exists subscription_id text,
  add column if not exists subscription_cycle integer;

create table if not exists store_subscriptions (
  id text primary key,
  stripe_session_id text unique,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  email text not null,
  first_name text not null,
  last_name text not null,
  lab text,
  phone text,
  address text not null,
  city text not null,
  region text,
  postal text not null,
  country text not null,
  product_id text not null,
  dose text not null,
  qty integer not null check (qty > 0 and qty <= 100),
  cadence text not null check (cadence in ('monthly', 'quarterly')),
  items jsonb not null,
  subtotal numeric not null,
  shipping numeric not null,
  sales_tax numeric not null default 0,
  tax_rate numeric not null default 0,
  discount numeric not null default 0,
  credit_applied numeric not null default 0,
  total numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'complete')),
  next_cycle integer not null default 1,
  first_order_review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists store_subscriptions_status_idx
  on store_subscriptions (status, updated_at desc);

create index if not exists store_orders_subscription_idx
  on store_orders (subscription_id, subscription_cycle)
  where subscription_id is not null;

-- A single durable queue covers supplier, owner, customer lifecycle, and
-- ordinary transactional messages. The existing unique (order_id, kind)
-- constraint makes settlement retries harmless.
create table if not exists manager_approval_queue (
  id text primary key,
  kind text not null check (kind in ('newsletter', 'partner', 'community', 'github')),
  title text not null,
  body text not null,
  source text,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected', 'archived', 'sent')),
  created_by text,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists manager_approval_queue_status_idx
  on manager_approval_queue (status, kind, created_at desc);

create table if not exists newsletter_deliveries (
  id bigserial primary key,
  approval_id text not null references manager_approval_queue(id),
  subscriber_id integer not null references store_subscribers(id),
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (approval_id, subscriber_id)
);
create index if not exists newsletter_deliveries_ready_idx
  on newsletter_deliveries (next_attempt_at, created_at)
  where sent_at is null;

create table if not exists partner_contacts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  organization text,
  channel text,
  audience text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'archived')),
  reviewed_at timestamptz
);
create index if not exists partner_contacts_created_idx
  on partner_contacts (created_at desc);

create table if not exists investor_contacts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  organization text,
  amount_interest text,
  experience text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'archived')),
  reviewed_at timestamptz
);
create index if not exists investor_contacts_created_idx
  on investor_contacts (created_at desc);

-- The repository list is a research backlog only. No repository code is
-- cloned, installed, executed, or deployed by the manager.
create table if not exists manager_repository_research (
  id bigserial primary key,
  url text not null unique,
  name text not null,
  license text,
  fit text not null,
  safety_notes text not null,
  status text not null default 'backlog'
    check (status in ('backlog', 'reviewed', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

insert into store_settings (key, value)
values
  ('sales_tax_rate_percent', '0'),
  ('tax_nexus_region', 'Illinois — configure before collecting tax'),
  ('income_tax_reserve_percent', '4.95'),
  ('supplier_email', 'Apex.nutrition2021@gmail.com'),
  ('owner_notification_email', 'vitalitychems@gmail.com'),
  ('newsletter_auto_send_enabled', 'true'),
  ('newsletter_send_interval_hours', '168')
on conflict (key) do nothing;

insert into manager_repository_research
  (url, name, license, fit, safety_notes)
values
  (
    'https://github.com/github/gh-aw',
    'GitHub Agentic Workflows',
    null,
    'Study guarded, auditable workflow design and human-review boundaries for scheduled automation.',
    'Reference only. Do not install or run workflow files in the storefront; review permissions, network access, generated artifacts, and action pinning first.'
  ),
  (
    'https://github.com/github/audit-actions-workflow-runs',
    'GitHub Audit Actions Workflow Runs',
    'MIT',
    'Study inventory and audit reporting for automation dependencies and exact action versions.',
    'Use only as a design reference. Never execute repository code or allow a manager to clone, install, or deploy it automatically.'
  ),
  (
    'https://github.com/PrefectHQ/prefect',
    'Prefect',
    null,
    'Study durable scheduling, retries, state transitions, and observable workflow runs.',
    'The storefront should borrow concepts, not import unreviewed runtime code. Keep all financial, fulfillment, and publication actions behind explicit approval.'
  ),
  (
    'https://github.com/pydantic/logfire',
    'Pydantic Logfire',
    null,
    'Study structured traces and service observability for production automation.',
    'Do not send customer addresses, emails, payment data, or supplier payloads to a third-party telemetry service without separate review.'
  )
on conflict (url) do nothing;
