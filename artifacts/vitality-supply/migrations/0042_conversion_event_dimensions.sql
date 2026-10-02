-- Store only the bounded, non-personal dimensions accepted by the shared
-- conversion contract. Existing purchase metadata remains untouched because it
-- is also the idempotency key for settlement events.
alter table store_events
  add column if not exists dimensions jsonb;

create index if not exists store_events_live_dimensions_idx
  on store_events (provenance, created_at desc, event)
  where provenance = 'live' and dimensions is not null;