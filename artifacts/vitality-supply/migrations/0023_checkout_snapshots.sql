-- Snapshot affiliate terms and make normalized manual payment references
-- impossible to reuse across paid orders.
alter table store_orders
  add column if not exists affiliate_owner_id text,
  add column if not exists affiliate_commission_rate numeric not null default 0,
  add column if not exists affiliate_commission numeric not null default 0;

create unique index if not exists store_orders_paid_manual_payment_ref_uidx
  on store_orders (lower(regexp_replace(payment_ref, '\s+', '', 'g')))
  where payment_status = 'paid'
    and payment_ref is not null
    and payment_method in ('zelle', 'bitcoin', 'ethereum');