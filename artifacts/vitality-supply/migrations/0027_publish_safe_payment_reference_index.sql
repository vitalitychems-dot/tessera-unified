-- Keep the existing case/whitespace-insensitive uniqueness rule, but do not
-- put its long expression in an index key. The publish schema introspector
-- truncates that key at 63 bytes, producing invalid SQL ('g'::t ... WHERE).
-- A stored generated column round-trips the complete expression separately.
-- The dev migrator runs this entire file in one transaction; production
-- receives the resulting schema through Publish, never a startup/build hook.
alter table store_orders
  add column if not exists payment_ref_normalized text
  generated always as (lower(regexp_replace(payment_ref, '\s+', '', 'g'))) stored;

drop index if exists store_orders_paid_manual_payment_ref_uidx;
create unique index store_orders_paid_manual_payment_ref_uidx
  on store_orders (payment_ref_normalized)
  where payment_status = 'paid'
    and payment_ref is not null
    and payment_method in ('zelle', 'bitcoin', 'ethereum');