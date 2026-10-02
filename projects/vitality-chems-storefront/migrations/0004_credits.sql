create table if not exists store_credits (
  user_id     text primary key,
  email       text,
  balance     numeric not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists store_credit_ledger (
  id          serial primary key,
  user_id     text not null,
  order_id    text,
  delta       numeric not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists store_credit_ledger_user_idx on store_credit_ledger (user_id, created_at desc);

alter table store_orders add column if not exists user_id text;
alter table store_orders add column if not exists credit_applied numeric not null default 0;
alter table store_orders add column if not exists credit_earned numeric not null default 0;
