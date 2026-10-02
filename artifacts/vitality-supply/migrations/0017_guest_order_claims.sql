-- Guest orders are claimable only through the authenticated, verified-email
-- claim operation. Keep unclaimed-order lookup/indexed ownership cheap without
-- relying on an email match as an access key.
create index if not exists store_orders_unclaimed_email_idx
  on store_orders(lower(email), created_at desc)
  where user_id is null;