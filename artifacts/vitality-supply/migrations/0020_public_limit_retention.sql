-- The application intentionally uses one non-spoofable global row per public
-- action. Remove legacy fingerprint rows and make that bounded shape durable.
delete from public_action_limits where request_key <> '__global__';
alter table public_action_limits
  drop constraint if exists public_action_limits_global_key_ck;
alter table public_action_limits
  add constraint public_action_limits_global_key_ck
  check (request_key = '__global__');