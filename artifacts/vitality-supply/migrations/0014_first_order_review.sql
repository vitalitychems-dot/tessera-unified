-- A first-order flag is not enough to protect fulfillment: staff must record an
-- explicit approval before a flagged paid order can ship.
alter table store_orders
  add column if not exists first_order_review_status text not null default 'pending';
alter table store_orders
  add column if not exists first_order_reviewed_at timestamptz;
alter table store_orders
  add column if not exists first_order_reviewed_by text;

-- Orders created after 0013 with no review requirement should not appear as
-- pending in the staff queue. Existing flagged orders intentionally remain
-- pending until an administrator reviews them.
update store_orders
set first_order_review_status = 'not_required'
where first_order_review_required = false
  and first_order_reviewed_at is null;

create index if not exists store_orders_first_review_idx
  on store_orders(first_order_review_status, created_at desc)
  where first_order_review_required = true;