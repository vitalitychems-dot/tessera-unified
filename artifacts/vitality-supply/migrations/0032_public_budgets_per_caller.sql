-- The public limiter must isolate callers. The old global row let one visitor
-- exhaust the allowance for every other visitor in the same action.
delete from public_action_limits
where request_key = '__global__';

alter table public_action_limits
  drop constraint if exists public_action_limits_global_key_ck;

alter table public_action_limits
  add constraint public_action_limits_request_key_ck
  check (request_key <> '' and request_key <> '__global__');