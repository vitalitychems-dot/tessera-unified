alter table store_orders add column if not exists promo_code text;

create table if not exists promo_codes (
  code        text primary key,
  kind        text not null default 'promo',
  percent     integer not null default 10,
  label       text,
  partner     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists promo_redemptions (
  id          serial primary key,
  code        text not null,
  order_id    text,
  email       text,
  amount      numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists promo_redemptions_code_idx on promo_redemptions (code);

insert into promo_codes (code, kind, percent, label, partner) values
  ('WELCOME10', 'promo', 10, 'First laboratory order', null),
  ('RESEARCH10', 'promo', 10, 'Research account', null),
  ('LAB10', 'affiliate', 10, 'Lab partner', 'Lab10'),
  ('PARTNER2025', 'affiliate', 10, '2025 partner', 'Partner 2025')
on conflict (code) do nothing;
