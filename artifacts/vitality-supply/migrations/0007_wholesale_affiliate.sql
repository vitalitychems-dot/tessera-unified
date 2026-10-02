alter table promo_codes add column if not exists owner_id text;
alter table promo_codes add column if not exists commission numeric not null default 12.5;

create table if not exists wholesale_leads (
  id          serial primary key,
  name        text not null,
  company     text,
  email       text not null,
  phone       text,
  budget      text,
  notes       text,
  created_at  timestamptz not null default now()
);
