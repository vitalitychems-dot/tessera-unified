-- 0018 initially capped the stored counter below the analytics global budget.
-- Keep existing databases aligned with the corrected fresh-install schema.
alter table public_action_limits
  drop constraint if exists public_action_limits_count_ck;
alter table public_action_limits
  add constraint public_action_limits_count_ck
  check (request_count between 0 and 10000);