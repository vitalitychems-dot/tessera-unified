-- Server-owned provenance for first-party funnel telemetry. Historical rows were
-- confirmed by the owner to be test activity; preserve them for audit history but
-- never let them drive live recommendations.
alter table store_events
  add column if not exists provenance text not null default 'test'
  check (provenance in ('live', 'test', 'demo'));

update store_events set provenance = 'test' where provenance is distinct from 'test';

create index if not exists store_events_live_current_idx
  on store_events (provenance, created_at desc, event);
create index if not exists store_events_live_product_idx
  on store_events (provenance, event, product_id)
  where provenance = 'live';