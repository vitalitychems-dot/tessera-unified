-- Keep public order links bounded even when a caller omits the expiry column.
alter table store_orders
  alter column access_key_expires_at
  set default (now() + interval '365 days');

update store_orders
set access_key_expires_at = coalesce(access_key_expires_at, created_at + interval '365 days')
where access_key_expires_at is null;