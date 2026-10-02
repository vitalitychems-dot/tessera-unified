-- Fencing and provenance for long-lived manager workers. An owner token is
-- required for every audit write so a stale worker cannot resume after recovery.
alter table manager_audit_runs
  add column if not exists owner_token text,
  add column if not exists heartbeat_at timestamptz;

create index if not exists manager_audit_runs_heartbeat_idx
  on manager_audit_runs(status, heartbeat_at);

alter table manager_competitor_snapshots
  drop constraint if exists manager_competitor_snapshots_status_check;
alter table manager_competitor_snapshots
  add constraint manager_competitor_snapshots_status_check
  check (status in ('checked', 'unverified', 'failed'));