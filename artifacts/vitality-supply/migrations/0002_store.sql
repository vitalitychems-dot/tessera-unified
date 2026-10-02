create table if not exists store_events (
  id           serial primary key,
  created_at   timestamptz not null default now(),
  session_id   text not null,
  event        text not null,
  path         text,
  product_id   text,
  product_name text,
  meta         text
);
create index if not exists store_events_created_idx on store_events (created_at desc);
create index if not exists store_events_event_idx on store_events (event);

create table if not exists store_orders (
  id           text primary key,
  created_at   timestamptz not null default now(),
  email        text not null,
  first_name   text not null,
  last_name    text not null,
  lab          text,
  phone        text,
  address      text not null,
  city         text not null,
  region       text,
  postal       text not null,
  country      text not null default 'United States',
  subtotal     numeric not null,
  shipping     numeric not null,
  discount     numeric not null default 0,
  total        numeric not null,
  items        text not null,
  status       text not null default 'received'
);
create index if not exists store_orders_created_idx on store_orders (created_at desc);
create index if not exists store_orders_email_idx on store_orders (email);

create table if not exists store_subscribers (
  id           serial primary key,
  created_at   timestamptz not null default now(),
  email        text not null,
  name         text,
  set_id       text,
  set_name     text,
  cadence      text,
  address      text,
  city         text,
  region       text,
  postal       text
);
create index if not exists store_subscribers_email_idx on store_subscribers (email);
