alter table store_orders add column if not exists reference text;
alter table store_orders add column if not exists access_key text;
alter table store_orders add column if not exists payment_method text;
alter table store_orders add column if not exists payment_status text not null default 'unpaid';
alter table store_orders add column if not exists payment_ref text;
alter table store_orders add column if not exists stripe_session_id text;
alter table store_orders add column if not exists btc_address text;
alter table store_orders add column if not exists btc_amount numeric(16,8);
alter table store_orders add column if not exists btc_rate numeric(12,2);
alter table store_orders add column if not exists btc_quote_expires_at timestamptz;
alter table store_orders add column if not exists claimed_at timestamptz;
alter table store_orders add column if not exists paid_at timestamptz;
alter table store_orders add column if not exists shipped_at timestamptz;
alter table store_orders add column if not exists tracking text;
alter table store_orders add column if not exists updated_at timestamptz not null default now();

create unique index if not exists store_orders_reference_uidx on store_orders(reference) where reference is not null;
create index if not exists store_orders_user_idx on store_orders(user_id);
create index if not exists store_orders_payment_status_idx on store_orders(payment_status);

create table if not exists store_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists store_order_events (
  id bigserial primary key,
  order_id text not null references store_orders(id),
  kind text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists store_order_events_order_idx on store_order_events(order_id, created_at);