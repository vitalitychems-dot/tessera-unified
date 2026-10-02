-- Publish synchronizes the schema but may not replay data-only migration
-- statements. Keep the observation gate singleton present in development and
-- make this safe to run after a previous partial publish.
insert into manager_observation_gate (id, status, blocked_reason)
values (true, 'awaiting_live_data', 'Waiting for the first server-classified live analytics event.')
on conflict (id) do nothing;