-- Publish diffs apply schema changes to the existing production rows, but do
-- not replay the data cleanup from 0032. Keep the request key nonempty while
-- allowing legacy __global__ rows that may still exist in production.
-- Runtime writes use per-caller HMAC keys; the sentinel is not generated again.
alter table public_action_limits
  drop constraint if exists public_action_limits_request_key_ck;

alter table public_action_limits
  add constraint public_action_limits_request_key_ck
  check (request_key <> '');