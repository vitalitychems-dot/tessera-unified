-- Checkout integrity: classify first-order promotions, reserve them by the
-- canonical customer identity, and make retries durable.
alter table promo_codes
  add column if not exists first_order_only boolean not null default false;

update promo_codes
set first_order_only = true
where code = 'WELCOME10';

alter table store_orders
  add column if not exists client_idempotency_key text,
  add column if not exists stripe_session_state text not null default 'not_started',
  add column if not exists stripe_checkout_url text;

create unique index if not exists store_orders_client_idempotency_uidx
  on store_orders(client_idempotency_key)
  where client_idempotency_key is not null;

create index if not exists store_orders_recent_unpaid_email_idx
  on store_orders(lower(email), created_at desc)
  where payment_status <> 'paid' and status <> 'cancelled';

create table if not exists store_promo_reservations (
  id                   bigserial primary key,
  code                 text not null references promo_codes(code),
  order_id             text not null unique references store_orders(id),
  customer_identity    text not null,
  status               text not null default 'pending',
  created_at           timestamptz not null default now(),
  settled_at           timestamptz,
  cancelled_at         timestamptz
);
create unique index if not exists store_promo_reservations_identity_uidx
  on store_promo_reservations(code, customer_identity)
  where status in ('pending', 'settled');
create index if not exists store_promo_reservations_order_idx
  on store_promo_reservations(order_id);

alter table promo_redemptions
  add column if not exists first_order_identity text;
create unique index if not exists promo_redemptions_first_order_identity_uidx
  on promo_redemptions(code, first_order_identity)
  where first_order_identity is not null;