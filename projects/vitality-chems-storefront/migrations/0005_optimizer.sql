create table if not exists merch_rank (
  product_id   text primary key,
  product_name text,
  views        integer not null default 0,
  carts        integer not null default 0,
  purchases    integer not null default 0,
  score        numeric not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists grok_actions (
  id          serial primary key,
  created_at  timestamptz not null default now(),
  title       text not null,
  body        text not null,
  applied     boolean not null default true
);

alter table promo_redemptions add column if not exists order_total numeric not null default 0;
alter table promo_redemptions add column if not exists merch numeric not null default 0;
alter table promo_redemptions add column if not exists commission numeric not null default 0;
