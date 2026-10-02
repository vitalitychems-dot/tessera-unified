-- `purchase` funnel events are written by order settlement only, at most once per
-- (order, compound). The index makes the post-commit insert idempotent so a
-- retried settlement notification can never double-count a paid order.
create unique index if not exists store_events_purchase_once
  on store_events (meta, product_id)
  where event = 'purchase';
