-- Settlement side effects must be unique per order so concurrent settlement paths
-- (webhook, order-page poll, staff reconciliation) cannot double-credit or double-log.
create unique index if not exists store_credit_ledger_order_reason_uniq
  on store_credit_ledger (order_id, user_id, reason) where order_id is not null;
create unique index if not exists promo_redemptions_order_uniq
  on promo_redemptions (order_id);
create unique index if not exists store_order_events_paid_uniq
  on store_order_events (order_id) where kind = 'paid';
create unique index if not exists store_order_events_mismatch_uniq
  on store_order_events (order_id) where kind = 'payment_mismatch';
