-- Link an order to the first-party analytics session that placed it so paid
-- orders can be recorded as real `purchase` funnel events (server-side, at
-- settlement) instead of relying on the buyer returning to the confirmation page.
alter table store_orders add column if not exists analytics_session_id text;
